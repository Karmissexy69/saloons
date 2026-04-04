package com.salonpos.service;

import com.salonpos.domain.ServiceCategory;
import com.salonpos.domain.CommissionRuleType;
import com.salonpos.domain.ServiceItem;
import com.salonpos.dto.CreateServiceRequest;
import com.salonpos.dto.PublicServiceResponse;
import com.salonpos.dto.ServiceItemResponse;
import com.salonpos.exception.BadRequestException;
import com.salonpos.exception.NotFoundException;
import com.salonpos.repository.ServiceCategoryRepository;
import com.salonpos.repository.ServiceItemRepository;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class ServiceCatalogService {

    private final ServiceCategoryRepository serviceCategoryRepository;
    private final ServiceItemRepository serviceItemRepository;
    private final AuditLogService auditLogService;

    public ServiceCatalogService(
        ServiceCategoryRepository serviceCategoryRepository,
        ServiceItemRepository serviceItemRepository,
        AuditLogService auditLogService
    ) {
        this.serviceCategoryRepository = serviceCategoryRepository;
        this.serviceItemRepository = serviceItemRepository;
        this.auditLogService = auditLogService;
    }

    public List<ServiceItemResponse> getActiveServices() {
        return serviceItemRepository.findByActiveTrueOrderByCategorySortOrderAscNameAsc()
            .stream()
            .map(this::toResponse)
            .toList();
    }

    public List<PublicServiceResponse> getPublicServices() {
        return serviceItemRepository.findByActiveTrueOrderByCategorySortOrderAscNameAsc()
            .stream()
            .map(item -> new PublicServiceResponse(
                item.getId(),
                item.getCategory().getId(),
                item.getCategory().getName(),
                item.getName(),
                item.getPrice(),
                item.getDurationMinutes()))
            .toList();
    }

    @Transactional
    public ServiceItemResponse createService(CreateServiceRequest request) {
        ServiceCategory category = resolveCategory(request);

        if (serviceItemRepository.existsByCategory_IdAndNameIgnoreCase(category.getId(), request.name().trim())) {
            throw new BadRequestException("Service already exists in this category.");
        }

        ServiceItem item = new ServiceItem();
        item.setCategory(category);
        item.setName(request.name().trim());
        item.setPrice(request.price());
        item.setDurationMinutes(request.durationMinutes());
        item.setCommissionType(request.commissionType() == null ? CommissionRuleType.PERCENTAGE : request.commissionType());
        item.setCommissionValue(request.commissionValue() == null ? BigDecimal.ZERO : request.commissionValue());
        item.setActive(request.active() == null || request.active());

        ServiceItem saved = serviceItemRepository.save(item);

        ServiceItemResponse response = toResponse(saved);
        auditLogService.log("SERVICE_CREATED", "service", saved.getId(), null, response);
        return response;
    }

    private ServiceItemResponse toResponse(ServiceItem item) {
        return new ServiceItemResponse(
            item.getId(),
            item.getCategory().getId(),
            item.getCategory().getName(),
            item.getName(),
            item.getPrice(),
            item.getDurationMinutes(),
            item.getCommissionType(),
            item.getCommissionValue()
        );
    }

    private ServiceCategory resolveCategory(CreateServiceRequest request) {
        if (request.categoryId() != null) {
            return serviceCategoryRepository.findById(request.categoryId())
                .orElseThrow(() -> new NotFoundException("Category not found: " + request.categoryId()));
        }

        if (!StringUtils.hasText(request.categoryName())) {
            throw new BadRequestException("Either categoryId or categoryName is required.");
        }

        String categoryName = request.categoryName().trim();
        return serviceCategoryRepository.findByNameIgnoreCase(categoryName)
            .orElseGet(() -> {
                int nextSort = serviceCategoryRepository.findTopByOrderBySortOrderDesc()
                    .map(ServiceCategory::getSortOrder)
                    .orElse(0) + 1;

                ServiceCategory newCategory = new ServiceCategory();
                newCategory.setName(categoryName);
                newCategory.setSortOrder(nextSort);
                newCategory.setActive(true);
                return serviceCategoryRepository.save(newCategory);
            });
    }
}
