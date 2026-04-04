package com.salonpos.controller;

import com.salonpos.dto.AppointmentResponse;
import com.salonpos.dto.CancelAppointmentRequest;
import com.salonpos.dto.CustomerCreateAppointmentRequest;
import com.salonpos.dto.CustomerProfileUpdateRequest;
import com.salonpos.dto.CustomerResponse;
import com.salonpos.dto.CustomerVoucherCatalogResponse;
import com.salonpos.dto.CustomerVoucherResponse;
import com.salonpos.dto.LoyaltyPointsTransactionResponse;
import com.salonpos.security.CustomerPrincipal;
import com.salonpos.service.AppointmentService;
import com.salonpos.service.CustomerService;
import com.salonpos.service.LoyaltyService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/customer/me")
public class CustomerProfileController {

    private final CustomerService customerService;
    private final AppointmentService appointmentService;
    private final LoyaltyService loyaltyService;

    public CustomerProfileController(
        CustomerService customerService,
        AppointmentService appointmentService,
        LoyaltyService loyaltyService
    ) {
        this.customerService = customerService;
        this.appointmentService = appointmentService;
        this.loyaltyService = loyaltyService;
    }

    @GetMapping
    public CustomerResponse getMe(@AuthenticationPrincipal CustomerPrincipal principal) {
        return customerService.get(principal.getCustomerId());
    }

    @PatchMapping
    public CustomerResponse updateMe(
        @AuthenticationPrincipal CustomerPrincipal principal,
        @Valid @RequestBody CustomerProfileUpdateRequest request
    ) {
        return customerService.update(
            principal.getCustomerId(),
            new com.salonpos.dto.UpdateCustomerRequest(
                request.name(),
                request.phone(),
                request.email(),
                request.birthday(),
                request.favoriteStaffId(),
                request.secondaryFavoriteStaffId(),
                request.marketingOptIn(),
                request.notes(),
                null
            )
        );
    }

    @GetMapping("/points-history")
    public List<LoyaltyPointsTransactionResponse> pointsHistory(@AuthenticationPrincipal CustomerPrincipal principal) {
        return customerService.listPointsHistory(principal.getCustomerId());
    }

    @GetMapping("/vouchers")
    public List<CustomerVoucherResponse> vouchers(@AuthenticationPrincipal CustomerPrincipal principal) {
        return customerService.listVouchers(principal.getCustomerId());
    }

    @GetMapping("/voucher-catalog")
    public List<CustomerVoucherCatalogResponse> voucherCatalog(@AuthenticationPrincipal CustomerPrincipal principal) {
        return loyaltyService.listVoucherCatalog(principal.getCustomerId());
    }

    @PostMapping("/vouchers/redeem/{catalogId}")
    public CustomerVoucherResponse redeemVoucher(@AuthenticationPrincipal CustomerPrincipal principal, @PathVariable Long catalogId) {
        return loyaltyService.redeemVoucher(principal.getCustomerId(), catalogId);
    }

    @GetMapping("/appointments")
    public List<AppointmentResponse> appointments(@AuthenticationPrincipal CustomerPrincipal principal) {
        return appointmentService.listForCustomer(principal.getCustomerId());
    }

    @PostMapping("/appointments")
    public AppointmentResponse createAppointment(
        @AuthenticationPrincipal CustomerPrincipal principal,
        @Valid @RequestBody CustomerCreateAppointmentRequest request
    ) {
        return appointmentService.createForCustomer(principal.getCustomerId(), request);
    }

    @PostMapping("/appointments/{bookingReference}/cancel")
    public AppointmentResponse cancelAppointment(
        @AuthenticationPrincipal CustomerPrincipal principal,
        @PathVariable String bookingReference,
        @Valid @RequestBody CancelAppointmentRequest request
    ) {
        return appointmentService.cancelByCustomer(principal.getCustomerId(), bookingReference, request);
    }
}
