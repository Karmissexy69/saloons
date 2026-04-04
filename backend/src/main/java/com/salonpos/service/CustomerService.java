package com.salonpos.service;

import com.salonpos.domain.Appointment;
import com.salonpos.domain.Customer;
import com.salonpos.domain.LoyaltyPointsTransaction;
import com.salonpos.domain.StaffProfile;
import com.salonpos.dto.CreateCustomerRequest;
import com.salonpos.dto.CustomerResponse;
import com.salonpos.dto.CustomerVoucherResponse;
import com.salonpos.dto.LoyaltyPointsTransactionResponse;
import com.salonpos.dto.UpdateCustomerRequest;
import com.salonpos.exception.BadRequestException;
import com.salonpos.exception.NotFoundException;
import com.salonpos.repository.AppointmentRepository;
import com.salonpos.repository.CustomerRepository;
import com.salonpos.repository.CustomerVoucherRepository;
import com.salonpos.repository.LoyaltyPointsTransactionRepository;
import com.salonpos.repository.StaffProfileRepository;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final StaffProfileRepository staffProfileRepository;
    private final LoyaltyPointsTransactionRepository loyaltyPointsTransactionRepository;
    private final CustomerVoucherRepository customerVoucherRepository;
    private final AppointmentRepository appointmentRepository;
    private final PhoneNumberService phoneNumberService;
    private final EmailAddressService emailAddressService;
    private final AuditLogService auditLogService;

    public CustomerService(
        CustomerRepository customerRepository,
        StaffProfileRepository staffProfileRepository,
        LoyaltyPointsTransactionRepository loyaltyPointsTransactionRepository,
        CustomerVoucherRepository customerVoucherRepository,
        AppointmentRepository appointmentRepository,
        PhoneNumberService phoneNumberService,
        EmailAddressService emailAddressService,
        AuditLogService auditLogService
    ) {
        this.customerRepository = customerRepository;
        this.staffProfileRepository = staffProfileRepository;
        this.loyaltyPointsTransactionRepository = loyaltyPointsTransactionRepository;
        this.customerVoucherRepository = customerVoucherRepository;
        this.appointmentRepository = appointmentRepository;
        this.phoneNumberService = phoneNumberService;
        this.emailAddressService = emailAddressService;
        this.auditLogService = auditLogService;
    }

    public List<CustomerResponse> search(String query) {
        String normalizedQuery = query == null ? "" : query.trim();
        return customerRepository.search(normalizedQuery).stream().map(this::toResponse).toList();
    }

    public CustomerResponse get(Long id) {
        return toResponse(requireDetailed(id));
    }

    @Transactional
    public CustomerResponse create(CreateCustomerRequest request) {
        String normalizedPhone = requireUniquePhone(request.phone(), null);
        String normalizedEmail = requireUniqueEmail(request.email(), null);
        Customer customer = new Customer();
        customer.setName(request.name().trim());
        customer.setPhone(request.phone().trim());
        customer.setPhoneNormalized(normalizedPhone);
        customer.setEmail(normalizedEmail);
        customer.setBirthday(request.birthday());
        customer.setFavoriteStaff(resolveStaff(request.favoriteStaffId()));
        customer.setSecondaryFavoriteStaff(resolveStaff(request.secondaryFavoriteStaffId()));
        customer.setMarketingOptIn(Boolean.TRUE.equals(request.marketingOptIn()));
        customer.setNotes(blankToNull(request.notes()));
        customer.setStatus("ACTIVE");
        customer.setPointsBalance(0);
        customer.setTotalSpend(BigDecimal.ZERO.setScale(2));
        customer.setTotalVisits(0);
        customer.setCreatedAt(OffsetDateTime.now());
        customer.setUpdatedAt(OffsetDateTime.now());
        Customer saved = customerRepository.save(customer);
        CustomerResponse response = toResponse(saved);
        auditLogService.log("CUSTOMER_CREATED", "customer", saved.getId(), null, response);
        return response;
    }

    @Transactional
    public CustomerResponse update(Long id, UpdateCustomerRequest request) {
        Customer customer = requireDetailed(id);
        CustomerResponse before = toResponse(customer);

        if (request.name() != null && !request.name().isBlank()) {
            customer.setName(request.name().trim());
        }
        if (request.phone() != null && !request.phone().isBlank()) {
            String normalizedPhone = requireUniquePhone(request.phone(), id);
            customer.setPhone(request.phone().trim());
            customer.setPhoneNormalized(normalizedPhone);
        }
        if (request.email() != null) {
            customer.setEmail(requireUniqueEmail(request.email(), id));
        }
        if (request.birthday() != null) {
            customer.setBirthday(request.birthday());
        }
        if (request.favoriteStaffId() != null) {
            customer.setFavoriteStaff(resolveStaff(request.favoriteStaffId()));
        }
        if (request.secondaryFavoriteStaffId() != null) {
            customer.setSecondaryFavoriteStaff(resolveStaff(request.secondaryFavoriteStaffId()));
        }
        if (request.marketingOptIn() != null) {
            customer.setMarketingOptIn(request.marketingOptIn());
        }
        if (request.notes() != null) {
            customer.setNotes(blankToNull(request.notes()));
        }
        if (request.status() != null && !request.status().isBlank()) {
            customer.setStatus(request.status().trim().toUpperCase());
        }
        customer.setUpdatedAt(OffsetDateTime.now());

        Customer saved = customerRepository.save(customer);
        CustomerResponse after = toResponse(saved);
        auditLogService.log("CUSTOMER_UPDATED", "customer", saved.getId(), before, after);
        return after;
    }

    public List<LoyaltyPointsTransactionResponse> listPointsHistory(Long customerId) {
        requireDetailed(customerId);
        return loyaltyPointsTransactionRepository.findByCustomerIdOrderByCreatedAtDesc(customerId).stream()
            .map(this::toPointsResponse)
            .toList();
    }

    public List<CustomerVoucherResponse> listVouchers(Long customerId) {
        requireDetailed(customerId);
        return customerVoucherRepository.findByCustomerIdWithCatalog(customerId).stream()
            .map(this::toVoucherResponse)
            .toList();
    }

    public CustomerResponse toResponse(Customer customer) {
        return new CustomerResponse(
            customer.getId(),
            customer.getName(),
            customer.getPhone(),
            customer.getPhoneNormalized(),
            customer.getEmail(),
            customer.getBirthday(),
            customer.getNotes(),
            customer.isMarketingOptIn(),
            customer.getStatus(),
            customer.getFavoriteStaff() == null ? null : customer.getFavoriteStaff().getId(),
            customer.getFavoriteStaff() == null ? null : customer.getFavoriteStaff().getDisplayName(),
            customer.getSecondaryFavoriteStaff() == null ? null : customer.getSecondaryFavoriteStaff().getId(),
            customer.getSecondaryFavoriteStaff() == null ? null : customer.getSecondaryFavoriteStaff().getDisplayName(),
            customer.getPointsBalance(),
            customer.getTotalSpend(),
            customer.getTotalVisits(),
            customer.getLastVisitAt()
        );
    }

    public Customer seedFromGuestHistoryByEmail(String normalizedEmail) {
        List<Appointment> guestAppointments = appointmentRepository.findGuestAppointmentsByGuestEmail(normalizedEmail);
        if (guestAppointments.isEmpty()) {
            return null;
        }

        Appointment latest = guestAppointments.getFirst();
        Customer customer = new Customer();
        customer.setName(
            latest.getGuestName() != null && !latest.getGuestName().isBlank()
                ? latest.getGuestName()
                : "Customer"
        );
        if (latest.getGuestPhone() != null && !latest.getGuestPhone().isBlank()) {
            String normalizedPhone = phoneNumberService.normalize(latest.getGuestPhone());
            if (!normalizedPhone.isBlank() && !customerRepository.existsByPhoneNormalized(normalizedPhone)) {
                customer.setPhone(latest.getGuestPhone().trim());
                customer.setPhoneNormalized(normalizedPhone);
            }
        }
        customer.setEmail(normalizedEmail);
        customer.setStatus("ACTIVE");
        customer.setPointsBalance(0);
        customer.setTotalSpend(BigDecimal.ZERO.setScale(2));
        customer.setTotalVisits(0);
        customer.setMarketingOptIn(false);
        customer.setCreatedAt(OffsetDateTime.now());
        customer.setUpdatedAt(OffsetDateTime.now());
        return customer;
    }

    public java.util.Optional<Customer> findUniqueByEmail(String email) {
        List<Customer> customers = customerRepository.findAllByEmailIgnoreCase(email);
        if (customers.size() > 1) {
            throw new BadRequestException("Multiple customer records exist for this email. Please contact support.");
        }
        return customers.stream().findFirst();
    }

    public Customer requireDetailed(Long id) {
        return customerRepository.findDetailedById(id)
            .orElseThrow(() -> new NotFoundException("Customer not found: " + id));
    }

    public Customer requireByPhoneNormalized(String normalizedPhone) {
        return customerRepository.findByPhoneNormalized(normalizedPhone)
            .orElseThrow(() -> new NotFoundException("Customer not found for phone."));
    }

    private LoyaltyPointsTransactionResponse toPointsResponse(LoyaltyPointsTransaction entry) {
        return new LoyaltyPointsTransactionResponse(
            entry.getId(),
            entry.getEntryType().name(),
            entry.getPointsDelta(),
            entry.getBalanceAfter(),
            entry.getRemarks(),
            entry.getTransactionId(),
            entry.getRefundId(),
            entry.getCustomerVoucherId(),
            entry.getCreatedAt()
        );
    }

    private CustomerVoucherResponse toVoucherResponse(com.salonpos.domain.CustomerVoucher voucher) {
        var catalog = voucher.getVoucherCatalog();
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

    private String requireUniquePhone(String phone, Long existingCustomerId) {
        String normalizedPhone = phoneNumberService.normalize(phone);
        if (normalizedPhone.isBlank()) {
            throw new BadRequestException("Phone number is required.");
        }

        boolean exists = existingCustomerId == null
            ? customerRepository.existsByPhoneNormalized(normalizedPhone)
            : customerRepository.existsByPhoneNormalizedAndIdNot(normalizedPhone, existingCustomerId);
        if (exists) {
            throw new BadRequestException("Phone number already exists.");
        }
        return normalizedPhone;
    }

    private String requireUniqueEmail(String email, Long existingCustomerId) {
        String normalizedEmail = emailAddressService.normalizeOptional(email);
        if (normalizedEmail == null) {
            return null;
        }

        boolean exists = existingCustomerId == null
            ? customerRepository.existsByEmailIgnoreCase(normalizedEmail)
            : customerRepository.existsByEmailIgnoreCaseAndIdNot(normalizedEmail, existingCustomerId);
        if (exists) {
            throw new BadRequestException("Email already exists.");
        }
        return normalizedEmail;
    }

    private StaffProfile resolveStaff(Long staffId) {
        if (staffId == null) {
            return null;
        }
        return staffProfileRepository.findById(staffId)
            .orElseThrow(() -> new NotFoundException("Staff not found: " + staffId));
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
