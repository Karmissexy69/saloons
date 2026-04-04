package com.salonpos.controller;

import com.salonpos.dto.LoyaltySettingsResponse;
import com.salonpos.dto.SaveVoucherCatalogRequest;
import com.salonpos.dto.UpdateLoyaltySettingsRequest;
import com.salonpos.dto.VoucherCatalogResponse;
import com.salonpos.service.LoyaltySettingsService;
import com.salonpos.service.VoucherCatalogService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
public class LoyaltyAdminController {

    private final LoyaltySettingsService loyaltySettingsService;
    private final VoucherCatalogService voucherCatalogService;

    public LoyaltyAdminController(LoyaltySettingsService loyaltySettingsService, VoucherCatalogService voucherCatalogService) {
        this.loyaltySettingsService = loyaltySettingsService;
        this.voucherCatalogService = voucherCatalogService;
    }

    @GetMapping("/loyalty-settings")
    public LoyaltySettingsResponse getSettings() {
        return loyaltySettingsService.get();
    }

    @PutMapping("/loyalty-settings")
    public LoyaltySettingsResponse updateSettings(@Valid @RequestBody UpdateLoyaltySettingsRequest request) {
        return loyaltySettingsService.update(request);
    }

    @GetMapping("/vouchers")
    public List<VoucherCatalogResponse> listVouchers() {
        return voucherCatalogService.list();
    }

    @PostMapping("/vouchers")
    public VoucherCatalogResponse createVoucher(@Valid @RequestBody SaveVoucherCatalogRequest request) {
        return voucherCatalogService.create(request);
    }

    @PatchMapping("/vouchers/{id}")
    public VoucherCatalogResponse updateVoucher(@PathVariable Long id, @Valid @RequestBody SaveVoucherCatalogRequest request) {
        return voucherCatalogService.update(id, request);
    }
}
