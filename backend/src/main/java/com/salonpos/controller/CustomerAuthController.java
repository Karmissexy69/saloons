package com.salonpos.controller;

import com.salonpos.dto.CustomerAuthResponse;
import com.salonpos.dto.CustomerLogoutRequest;
import com.salonpos.dto.CustomerOtpRequest;
import com.salonpos.dto.CustomerOtpVerifyRequest;
import com.salonpos.dto.CustomerTokenRefreshRequest;
import com.salonpos.dto.OtpChallengeResponse;
import com.salonpos.service.CustomerAuthService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/customer-auth")
public class CustomerAuthController {

    private final CustomerAuthService customerAuthService;

    public CustomerAuthController(CustomerAuthService customerAuthService) {
        this.customerAuthService = customerAuthService;
    }

    @PostMapping("/request-otp")
    public OtpChallengeResponse requestOtp(@Valid @RequestBody CustomerOtpRequest request) {
        return customerAuthService.requestOtp(request);
    }

    @PostMapping("/verify-otp")
    public CustomerAuthResponse verifyOtp(@Valid @RequestBody CustomerOtpVerifyRequest request) {
        return customerAuthService.verifyOtp(request);
    }

    @PostMapping("/refresh")
    public CustomerAuthResponse refresh(@Valid @RequestBody CustomerTokenRefreshRequest request) {
        return customerAuthService.refresh(request);
    }

    @PostMapping("/logout")
    public void logout(@Valid @RequestBody CustomerLogoutRequest request) {
        customerAuthService.logout(request);
    }
}
