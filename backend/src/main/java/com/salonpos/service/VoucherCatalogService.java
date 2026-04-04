package com.salonpos.service;

import com.salonpos.domain.ServiceItem;
import com.salonpos.domain.VoucherCatalog;
import com.salonpos.dto.SaveVoucherCatalogRequest;
import com.salonpos.dto.VoucherCatalogResponse;
import com.salonpos.exception.BadRequestException;
import com.salonpos.exception.NotFoundException;
import com.salonpos.repository.ServiceItemRepository;
import com.salonpos.repository.VoucherCatalogRepository;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class VoucherCatalogService {

    private final VoucherCatalogRepository voucherCatalogRepository;
    private final ServiceItemRepository serviceItemRepository;
    private final AuditLogService auditLogService;

    public VoucherCatalogService(
        VoucherCatalogRepository voucherCatalogRepository,
        ServiceItemRepository serviceItemRepository,
        AuditLogService auditLogService
    ) {
        this.voucherCatalogRepository = voucherCatalogRepository;
        this.serviceItemRepository = serviceItemRepository;
        this.auditLogService = auditLogService;
    }

    public List<VoucherCatalogResponse> list() {
        return voucherCatalogRepository.findAllByOrderByActiveDescNameAsc().stream().map(this::toResponse).toList();
    }

    @Transactional
    public VoucherCatalogResponse create(SaveVoucherCatalogRequest request) {
        if (voucherCatalogRepository.findByCodeIgnoreCase(request.code().trim()).isPresent()) {
            throw new BadRequestException("Voucher code already exists.");
        }

        VoucherCatalog voucher = new VoucherCatalog();
        apply(voucher, request);
        voucher.setCreatedAt(OffsetDateTime.now());
        voucher.setUpdatedAt(OffsetDateTime.now());
        VoucherCatalog saved = voucherCatalogRepository.save(voucher);
        VoucherCatalogResponse response = toResponse(saved);
        auditLogService.log("VOUCHER_CATALOG_CREATED", "voucher_catalog", saved.getId(), null, response);
        return response;
    }

    @Transactional
    public VoucherCatalogResponse update(Long id, SaveVoucherCatalogRequest request) {
        VoucherCatalog voucher = voucherCatalogRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Voucher catalog not found: " + id));

        voucherCatalogRepository.findByCodeIgnoreCase(request.code().trim())
            .filter(existing -> !existing.getId().equals(id))
            .ifPresent(existing -> {
                throw new BadRequestException("Voucher code already exists.");
            });

        VoucherCatalogResponse before = toResponse(voucher);
        apply(voucher, request);
        voucher.setUpdatedAt(OffsetDateTime.now());
        VoucherCatalog saved = voucherCatalogRepository.save(voucher);
        VoucherCatalogResponse response = toResponse(saved);
        auditLogService.log("VOUCHER_CATALOG_UPDATED", "voucher_catalog", saved.getId(), before, response);
        return response;
    }

    private void apply(VoucherCatalog voucher, SaveVoucherCatalogRequest request) {
        voucher.setCode(request.code().trim().toUpperCase());
        voucher.setName(request.name().trim());
        voucher.setDescription(request.description() == null || request.description().isBlank() ? null : request.description().trim());
        voucher.setVoucherType(request.voucherType());
        voucher.setDiscountValue(scale(request.discountValue()));
        voucher.setPointsCost(request.pointsCost());
        voucher.setMinSpend(request.minSpend() == null ? null : scale(request.minSpend()));
        voucher.setBranchId(request.branchId());
        voucher.setService(resolveService(request.serviceId()));
        voucher.setActive(request.active() == null || request.active());
        voucher.setValidFrom(request.validFrom());
        voucher.setValidTo(request.validTo());
        voucher.setDailyRedemptionLimit(request.dailyRedemptionLimit());

        if (voucher.getVoucherType() == com.salonpos.domain.VoucherType.SERVICE && voucher.getService() == null) {
            throw new BadRequestException("Service vouchers require a service.");
        }
    }

    private ServiceItem resolveService(Long serviceId) {
        if (serviceId == null) {
            return null;
        }
        return serviceItemRepository.findById(serviceId)
            .orElseThrow(() -> new NotFoundException("Service not found: " + serviceId));
    }

    private VoucherCatalogResponse toResponse(VoucherCatalog voucher) {
        return new VoucherCatalogResponse(
            voucher.getId(),
            voucher.getCode(),
            voucher.getName(),
            voucher.getDescription(),
            voucher.getVoucherType().name(),
            voucher.getDiscountValue(),
            voucher.getPointsCost(),
            voucher.getMinSpend(),
            voucher.getBranchId(),
            voucher.getService() == null ? null : voucher.getService().getId(),
            voucher.getService() == null ? null : voucher.getService().getName(),
            voucher.isActive(),
            voucher.getValidFrom(),
            voucher.getValidTo(),
            voucher.getDailyRedemptionLimit()
        );
    }

    private BigDecimal scale(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }
}
