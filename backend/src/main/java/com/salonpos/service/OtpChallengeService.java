package com.salonpos.service;

import com.salonpos.config.NotificationProperties;
import com.salonpos.domain.CustomerOtpChallenge;
import com.salonpos.domain.CustomerOtpPurpose;
import com.salonpos.dto.OtpChallengeResponse;
import com.salonpos.exception.BadRequestException;
import com.salonpos.repository.CustomerOtpChallengeRepository;
import jakarta.transaction.Transactional;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class OtpChallengeService {

    private final CustomerOtpChallengeRepository customerOtpChallengeRepository;
    private final EmailAddressService emailAddressService;
    private final PasswordEncoder passwordEncoder;
    private final OtpDeliveryService otpDeliveryService;
    private final NotificationProperties notificationProperties;
    private final SecureRandom secureRandom = new SecureRandom();

    public OtpChallengeService(
        CustomerOtpChallengeRepository customerOtpChallengeRepository,
        EmailAddressService emailAddressService,
        PasswordEncoder passwordEncoder,
        OtpDeliveryService otpDeliveryService,
        NotificationProperties notificationProperties
    ) {
        this.customerOtpChallengeRepository = customerOtpChallengeRepository;
        this.emailAddressService = emailAddressService;
        this.passwordEncoder = passwordEncoder;
        this.otpDeliveryService = otpDeliveryService;
        this.notificationProperties = notificationProperties;
    }

    @Transactional
    public OtpChallengeResponse issue(String email, CustomerOtpPurpose purpose, String referenceValue) {
        String normalizedEmail = emailAddressService.normalize(email);

        String otpCode = String.format("%06d", secureRandom.nextInt(1_000_000));
        CustomerOtpChallenge challenge = new CustomerOtpChallenge();
        challenge.setEmail(email.trim());
        challenge.setEmailNormalized(normalizedEmail);
        challenge.setOtpHash(passwordEncoder.encode(otpCode));
        challenge.setPurpose(purpose);
        challenge.setReferenceValue(blankToNull(referenceValue));
        challenge.setExpiresAt(OffsetDateTime.now().plusSeconds(notificationProperties.getOtpTtlSeconds()));
        challenge.setAttemptCount(0);
        challenge.setMaxAttempts(5);
        challenge.setChannel("EMAIL");
        challenge.setCreatedAt(OffsetDateTime.now());
        customerOtpChallengeRepository.save(challenge);

        otpDeliveryService.sendOtp(email.trim(), otpCode, purpose);
        return new OtpChallengeResponse("OTP sent.", notificationProperties.getOtpTtlSeconds());
    }

    @Transactional
    public void verify(String email, CustomerOtpPurpose purpose, String referenceValue, String otpCode) {
        String normalizedEmail = emailAddressService.normalize(email);

        CustomerOtpChallenge challenge = customerOtpChallengeRepository
            .findLatest(
                normalizedEmail,
                purpose,
                blankToNull(referenceValue),
                PageRequest.of(0, 1)
            )
            .stream()
            .findFirst()
            .orElseThrow(() -> new BadRequestException("OTP challenge not found."));

        if (challenge.getConsumedAt() != null) {
            throw new BadRequestException("OTP has already been used.");
        }
        if (challenge.getExpiresAt().isBefore(OffsetDateTime.now())) {
            throw new BadRequestException("OTP has expired.");
        }
        if (challenge.getAttemptCount() >= challenge.getMaxAttempts()) {
            throw new BadRequestException("Too many OTP attempts.");
        }
        if (!passwordEncoder.matches(otpCode, challenge.getOtpHash())) {
            challenge.setAttemptCount(challenge.getAttemptCount() + 1);
            customerOtpChallengeRepository.save(challenge);
            throw new BadRequestException("Invalid OTP.");
        }

        challenge.setAttemptCount(challenge.getAttemptCount() + 1);
        challenge.setConsumedAt(OffsetDateTime.now());
        customerOtpChallengeRepository.save(challenge);
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
