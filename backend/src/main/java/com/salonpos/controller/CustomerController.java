package com.salonpos.controller;

import com.salonpos.dto.CreateCustomerRequest;
import com.salonpos.dto.CustomerResponse;
import com.salonpos.dto.CustomerVoucherResponse;
import com.salonpos.dto.LoyaltyPointsTransactionResponse;
import com.salonpos.dto.PointsAdjustmentRequest;
import com.salonpos.dto.UpdateCustomerRequest;
import com.salonpos.service.CustomerService;
import com.salonpos.service.LoyaltyService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/customers")
public class CustomerController {

    private final CustomerService customerService;
    private final LoyaltyService loyaltyService;

    public CustomerController(CustomerService customerService, LoyaltyService loyaltyService) {
        this.customerService = customerService;
        this.loyaltyService = loyaltyService;
    }

    @GetMapping
    public List<CustomerResponse> list(@RequestParam(required = false) String q) {
        return customerService.search(q);
    }

    @GetMapping("/{id}")
    public CustomerResponse get(@PathVariable Long id) {
        return customerService.get(id);
    }

    @PostMapping
    public CustomerResponse create(@Valid @RequestBody CreateCustomerRequest request) {
        return customerService.create(request);
    }

    @PatchMapping("/{id}")
    public CustomerResponse update(@PathVariable Long id, @Valid @RequestBody UpdateCustomerRequest request) {
        return customerService.update(id, request);
    }

    @GetMapping("/{id}/points-history")
    public List<LoyaltyPointsTransactionResponse> pointsHistory(@PathVariable Long id) {
        return customerService.listPointsHistory(id);
    }

    @GetMapping("/{id}/vouchers")
    public List<CustomerVoucherResponse> vouchers(@PathVariable Long id) {
        return customerService.listVouchers(id);
    }

    @PostMapping("/{id}/points-adjustments")
    public LoyaltyPointsTransactionResponse adjustPoints(@PathVariable Long id, @Valid @RequestBody PointsAdjustmentRequest request) {
        var entry = loyaltyService.manualAdjust(customerService.requireDetailed(id), request.pointsDelta(), request.remarks().trim());
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

    @PostMapping("/{id}/vouchers/redeem/{catalogId}")
    public CustomerVoucherResponse redeemVoucher(@PathVariable Long id, @PathVariable Long catalogId) {
        return loyaltyService.redeemVoucher(id, catalogId);
    }
}
