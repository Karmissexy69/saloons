package com.salonpos.service;

import com.salonpos.domain.Customer;
import com.salonpos.domain.CustomerVoucher;
import com.salonpos.domain.CustomerVoucherStatus;
import com.salonpos.domain.LoyaltyPointsEntryType;
import com.salonpos.domain.LoyaltyPointsTransaction;
import com.salonpos.domain.Refund;
import com.salonpos.domain.SalesTransaction;
import com.salonpos.domain.TransactionLine;
import com.salonpos.domain.VoucherCatalog;
import com.salonpos.domain.VoucherType;
import com.salonpos.dto.CustomerVoucherCatalogResponse;
import com.salonpos.dto.CustomerVoucherResponse;
import com.salonpos.exception.BadRequestException;
import com.salonpos.exception.NotFoundException;
import com.salonpos.repository.CustomerRepository;
import com.salonpos.repository.CustomerVoucherRepository;
import com.salonpos.repository.LoyaltyPointsTransactionRepository;
import com.salonpos.repository.VoucherCatalogRepository;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class LoyaltyService {

    private final CustomerRepository customerRepository;
    private final LoyaltyPointsTransactionRepository loyaltyPointsTransactionRepository;
    private final VoucherCatalogRepository voucherCatalogRepository;
    private final CustomerVoucherRepository customerVoucherRepository;
    private final LoyaltySettingsService loyaltySettingsService;
    private final AuditLogService auditLogService;

    public LoyaltyService(
        CustomerRepository customerRepository,
        LoyaltyPointsTransactionRepository loyaltyPointsTransactionRepository,
        VoucherCatalogRepository voucherCatalogRepository,
        CustomerVoucherRepository customerVoucherRepository,
        LoyaltySettingsService loyaltySettingsService,
        AuditLogService auditLogService
    ) {
        this.customerRepository = customerRepository;
        this.loyaltyPointsTransactionRepository = loyaltyPointsTransactionRepository;
        this.voucherCatalogRepository = voucherCatalogRepository;
        this.customerVoucherRepository = customerVoucherRepository;
        this.loyaltySettingsService = loyaltySettingsService;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public void recordPaidTransaction(SalesTransaction transaction) {
        Customer customer = transaction.getCustomer();
        if (customer == null) {
            return;
        }

        customer.setTotalSpend(scale(customer.getTotalSpend().add(transaction.getTotal())));
        customer.setTotalVisits(customer.getTotalVisits() + 1);
        customer.setLastVisitAt(transaction.getSoldAt());
        customer.setUpdatedAt(OffsetDateTime.now());
        customerRepository.save(customer);

        if (!loyaltySettingsService.isPointsEnabled()) {
            return;
        }

        int earnedPoints = transaction.getTotal()
            .multiply(loyaltySettingsService.getPointsEarnPercent())
            .divide(BigDecimal.valueOf(100), 0, RoundingMode.DOWN)
            .intValue();
        if (earnedPoints <= 0) {
            return;
        }

        appendEntry(customer, LoyaltyPointsEntryType.EARN, earnedPoints, transaction.getId(), null, transaction.getCustomerVoucher(), "Earned from transaction");
    }

    @Transactional
    public void reverseForRefund(Refund refund) {
        SalesTransaction transaction = refund.getTransaction();
        Customer customer = transaction.getCustomer();
        if (customer == null) {
            return;
        }

        customer.setTotalSpend(scale(customer.getTotalSpend().subtract(refund.getTotalRefund()).max(BigDecimal.ZERO)));
        customer.setUpdatedAt(OffsetDateTime.now());
        if (refund.getTotalRefund().compareTo(transaction.getTotal()) == 0 && customer.getTotalVisits() > 0) {
            customer.setTotalVisits(customer.getTotalVisits() - 1);
        }
        customerRepository.save(customer);

        loyaltyPointsTransactionRepository.findTopByTransactionIdAndEntryType(transaction.getId(), LoyaltyPointsEntryType.EARN)
            .ifPresent(earnEntry -> {
                BigDecimal ratio = refund.getTotalRefund().divide(transaction.getTotal(), 8, RoundingMode.HALF_UP);
                int reversal = BigDecimal.valueOf(earnEntry.getPointsDelta())
                    .multiply(ratio)
                    .setScale(0, RoundingMode.DOWN)
                    .intValue();
                if (reversal > 0) {
                    appendEntry(customer, LoyaltyPointsEntryType.REFUND_REVERSAL, -reversal, transaction.getId(), refund.getId(), transaction.getCustomerVoucher(), "Refund reversal");
                }
            });

        if (refund.getTotalRefund().compareTo(transaction.getTotal()) == 0 && transaction.getCustomerVoucher() != null) {
            restoreVoucher(transaction.getCustomerVoucher());
        }
    }

    @Transactional
    public LoyaltyPointsTransaction manualAdjust(Customer customer, int pointsDelta, String remarks) {
        if (pointsDelta == 0) {
            throw new BadRequestException("Points adjustment cannot be zero.");
        }
        return appendEntry(customer, LoyaltyPointsEntryType.MANUAL_ADJUSTMENT, pointsDelta, null, null, null, remarks);
    }

    @Transactional
    public CustomerVoucherResponse redeemVoucher(Long customerId, Long catalogId) {
        if (!loyaltySettingsService.isVoucherRedemptionEnabled()) {
            throw new BadRequestException("Voucher redemption is disabled.");
        }

        Customer customer = customerRepository.findById(customerId)
            .orElseThrow(() -> new NotFoundException("Customer not found: " + customerId));
        VoucherCatalog catalog = voucherCatalogRepository.findById(catalogId)
            .orElseThrow(() -> new NotFoundException("Voucher catalog not found: " + catalogId));

        validateVoucherCatalogRedeemable(catalog);
        if (customer.getPointsBalance() < catalog.getPointsCost()) {
            throw new BadRequestException("Customer does not have enough points.");
        }

        CustomerVoucher voucher = new CustomerVoucher();
        voucher.setCustomer(customer);
        voucher.setVoucherCatalog(catalog);
        voucher.setStatus(CustomerVoucherStatus.AVAILABLE);
        voucher.setExpiresAt(catalog.getValidTo());
        voucher.setRedeemedAt(OffsetDateTime.now());
        voucher.setCreatedAt(OffsetDateTime.now());
        voucher.setUpdatedAt(OffsetDateTime.now());
        CustomerVoucher saved = customerVoucherRepository.save(voucher);

        appendEntry(customer, LoyaltyPointsEntryType.REDEEM, -catalog.getPointsCost(), null, null, saved, "Voucher redeemed");
        CustomerVoucherResponse response = toVoucherResponse(saved);
        auditLogService.log("CUSTOMER_VOUCHER_REDEEMED", "customer_voucher", saved.getId(), null, response);
        return response;
    }

    public List<CustomerVoucherCatalogResponse> listVoucherCatalog(Long customerId) {
        Customer customer = customerRepository.findById(customerId)
            .orElseThrow(() -> new NotFoundException("Customer not found: " + customerId));
        OffsetDateTime now = OffsetDateTime.now();

        return voucherCatalogRepository.findActiveCatalogVisibleAt(now).stream()
            .map(catalog -> toCatalogResponse(customer, catalog, now))
            .toList();
    }

    public VoucherApplication prepareVoucherApplication(Long customerId, Long customerVoucherId, Long branchId, BigDecimal subtotalAfterManualDiscount, List<TransactionLine> lines) {
        if (customerVoucherId == null) {
            return VoucherApplication.none();
        }
        if (customerId == null) {
            throw new BadRequestException("A customer is required to use a voucher.");
        }

        CustomerVoucher customerVoucher = customerVoucherRepository.findDetailedById(customerVoucherId)
            .orElseThrow(() -> new NotFoundException("Customer voucher not found: " + customerVoucherId));
        if (!customerVoucher.getCustomer().getId().equals(customerId)) {
            throw new BadRequestException("Voucher does not belong to the selected customer.");
        }
        if (customerVoucher.getStatus() != CustomerVoucherStatus.AVAILABLE) {
            throw new BadRequestException("Voucher is not available.");
        }

        VoucherCatalog catalog = customerVoucher.getVoucherCatalog();
        validateVoucherForUsage(catalog, branchId, subtotalAfterManualDiscount, lines);
        BigDecimal discount = calculateVoucherDiscount(catalog, subtotalAfterManualDiscount, lines);
        return new VoucherApplication(customerVoucher, discount);
    }

    @Transactional
    public void consumeVoucher(VoucherApplication application, SalesTransaction transaction) {
        if (application.isNone()) {
            return;
        }
        CustomerVoucher voucher = application.customerVoucher();
        voucher.setStatus(CustomerVoucherStatus.USED);
        voucher.setUsedTransaction(transaction);
        voucher.setUsedAt(OffsetDateTime.now());
        voucher.setUpdatedAt(OffsetDateTime.now());
        customerVoucherRepository.save(voucher);
    }

    @Transactional
    public void restoreVoucher(CustomerVoucher voucher) {
        voucher.setStatus(CustomerVoucherStatus.AVAILABLE);
        voucher.setUsedTransaction(null);
        voucher.setUsedAt(null);
        voucher.setUpdatedAt(OffsetDateTime.now());
        customerVoucherRepository.save(voucher);
    }

    public List<CustomerVoucherResponse> listCatalogResponses() {
        return customerVoucherRepository.findAll().stream().map(this::toVoucherResponse).toList();
    }

    private CustomerVoucherCatalogResponse toCatalogResponse(Customer customer, VoucherCatalog catalog, OffsetDateTime now) {
        String blockedReason = getCatalogRedemptionBlockedReason(customer, catalog, now);
        return new CustomerVoucherCatalogResponse(
            catalog.getId(),
            catalog.getCode(),
            catalog.getName(),
            catalog.getDescription(),
            catalog.getVoucherType().name(),
            catalog.getDiscountValue(),
            catalog.getPointsCost(),
            catalog.getMinSpend(),
            catalog.getBranchId(),
            catalog.getService() == null ? null : catalog.getService().getId(),
            catalog.getService() == null ? null : catalog.getService().getName(),
            catalog.getValidFrom(),
            catalog.getValidTo(),
            blockedReason == null,
            blockedReason
        );
    }

    private void validateVoucherCatalogRedeemable(VoucherCatalog catalog) {
        OffsetDateTime now = OffsetDateTime.now();
        String blockedReason = getCatalogAvailabilityBlockedReason(catalog, now);
        if (blockedReason != null) {
            throw new BadRequestException(blockedReason);
        }
    }

    private void validateVoucherForUsage(VoucherCatalog catalog, Long branchId, BigDecimal subtotalAfterManualDiscount, List<TransactionLine> lines) {
        validateVoucherCatalogRedeemable(catalog);
        if (catalog.getBranchId() != null && !catalog.getBranchId().equals(branchId)) {
            throw new BadRequestException("Voucher is not valid for this branch.");
        }
        if (catalog.getMinSpend() != null && subtotalAfterManualDiscount.compareTo(catalog.getMinSpend()) < 0) {
            throw new BadRequestException("Voucher minimum spend not met.");
        }
        if (catalog.getVoucherType() == VoucherType.SERVICE && catalog.getService() == null) {
            throw new BadRequestException("Service voucher configuration is incomplete.");
        }
        if (catalog.getVoucherType() == VoucherType.SERVICE) {
            boolean matchingService = lines.stream().anyMatch(line -> line.getService().getId().equals(catalog.getService().getId()));
            if (!matchingService) {
                throw new BadRequestException("Voucher applies to a service not present in the cart.");
            }
        }
    }

    private BigDecimal calculateVoucherDiscount(VoucherCatalog catalog, BigDecimal subtotalAfterManualDiscount, List<TransactionLine> lines) {
        BigDecimal discount = switch (catalog.getVoucherType()) {
            case FIXED_AMOUNT -> catalog.getDiscountValue();
            case PERCENTAGE -> subtotalAfterManualDiscount
                .multiply(catalog.getDiscountValue())
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            case SERVICE -> lines.stream()
                .filter(line -> catalog.getService() != null && line.getService().getId().equals(catalog.getService().getId()))
                .findFirst()
                .map(line -> line.getUnitPrice().multiply(BigDecimal.valueOf(line.getQty())))
                .orElse(BigDecimal.ZERO);
        };
        return scale(discount.min(subtotalAfterManualDiscount));
    }

    private LoyaltyPointsTransaction appendEntry(
        Customer customer,
        LoyaltyPointsEntryType entryType,
        int pointsDelta,
        Long transactionId,
        Long refundId,
        CustomerVoucher customerVoucher,
        String remarks
    ) {
        int nextBalance = customer.getPointsBalance() + pointsDelta;
        if (nextBalance < 0) {
            throw new BadRequestException("Customer points cannot go negative.");
        }

        customer.setPointsBalance(nextBalance);
        customer.setUpdatedAt(OffsetDateTime.now());
        customerRepository.save(customer);

        LoyaltyPointsTransaction entry = new LoyaltyPointsTransaction();
        entry.setCustomer(customer);
        entry.setTransactionId(transactionId);
        entry.setRefundId(refundId);
        entry.setCustomerVoucherId(customerVoucher == null ? null : customerVoucher.getId());
        entry.setEntryType(entryType);
        entry.setPointsDelta(pointsDelta);
        entry.setBalanceAfter(nextBalance);
        entry.setRemarks(remarks);
        entry.setCreatedAt(OffsetDateTime.now());
        return loyaltyPointsTransactionRepository.save(entry);
    }

    private CustomerVoucherResponse toVoucherResponse(CustomerVoucher voucher) {
        VoucherCatalog catalog = voucher.getVoucherCatalog();
        return new CustomerVoucherResponse(
            voucher.getId(),
            voucher.getCustomer().getId(),
            catalog.getId(),
            catalog.getCode(),
            catalog.getName(),
            catalog.getVoucherType().name(),
            catalog.getDiscountValue(),
            catalog.getMinSpend(),
            catalog.getBranchId(),
            catalog.getService() == null ? null : catalog.getService().getId(),
            catalog.getService() == null ? null : catalog.getService().getName(),
            voucher.getStatus().name(),
            voucher.getExpiresAt(),
            voucher.getRedeemedAt(),
            voucher.getUsedAt()
        );
    }

    private String getCatalogRedemptionBlockedReason(Customer customer, VoucherCatalog catalog, OffsetDateTime now) {
        if (!loyaltySettingsService.isVoucherRedemptionEnabled()) {
            return "Voucher redemption is disabled.";
        }
        String availabilityBlockedReason = getCatalogAvailabilityBlockedReason(catalog, now);
        if (availabilityBlockedReason != null) {
            return availabilityBlockedReason;
        }
        if (customer.getPointsBalance() < catalog.getPointsCost()) {
            return "Not enough points.";
        }
        return null;
    }

    private String getCatalogAvailabilityBlockedReason(VoucherCatalog catalog, OffsetDateTime now) {
        if (!catalog.isActive()) {
            return "Voucher is inactive.";
        }
        if (catalog.getValidFrom() != null && now.isBefore(catalog.getValidFrom())) {
            return "Voucher is not active yet.";
        }
        if (catalog.getValidTo() != null && now.isAfter(catalog.getValidTo())) {
            return "Voucher has expired.";
        }
        if (catalog.getDailyRedemptionLimit() != null && catalog.getDailyRedemptionLimit() > 0) {
            OffsetDateTime dayStart = now.withOffsetSameInstant(ZoneOffset.UTC).toLocalDate().atStartOfDay().atOffset(ZoneOffset.UTC);
            OffsetDateTime dayEnd = dayStart.plusDays(1);
            long todayCount = customerVoucherRepository.countRedemptionsForCatalogBetween(catalog.getId(), dayStart, dayEnd);
            if (todayCount >= catalog.getDailyRedemptionLimit()) {
                return "Voucher daily redemption limit reached.";
            }
        }
        return null;
    }

    private BigDecimal scale(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    public record VoucherApplication(CustomerVoucher customerVoucher, BigDecimal discount) {
        public static VoucherApplication none() {
            return new VoucherApplication(null, BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
        }

        public boolean isNone() {
            return customerVoucher == null;
        }
    }
}
