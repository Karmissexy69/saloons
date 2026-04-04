package com.salonpos.service;

import com.salonpos.domain.CustomerOtpPurpose;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(prefix = "app.notifications", name = "email-provider", havingValue = "LOG", matchIfMissing = true)
public class LoggingOtpDeliveryService implements OtpDeliveryService {

    private static final Logger log = LoggerFactory.getLogger(LoggingOtpDeliveryService.class);

    @Override
    public void sendOtp(String email, String code, CustomerOtpPurpose purpose) {
        log.info("OTP {} for {} purpose {}", code, email, purpose);
    }
}
