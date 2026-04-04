package com.salonpos.service;

import com.salonpos.domain.CustomerOtpPurpose;

public interface OtpDeliveryService {

    void sendOtp(String email, String code, CustomerOtpPurpose purpose);
}
