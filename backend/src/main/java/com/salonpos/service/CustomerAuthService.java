package com.salonpos.service;

import com.salonpos.config.NotificationProperties;
import com.salonpos.domain.Customer;
import com.salonpos.domain.CustomerOtpPurpose;
import com.salonpos.domain.CustomerSession;
import com.salonpos.dto.CustomerAuthResponse;
import com.salonpos.dto.CustomerLogoutRequest;
import com.salonpos.dto.CustomerOtpRequest;
import com.salonpos.dto.CustomerOtpVerifyRequest;
import com.salonpos.dto.CustomerResponse;
import com.salonpos.dto.CustomerTokenRefreshRequest;
import com.salonpos.dto.OtpChallengeResponse;
import com.salonpos.exception.BadRequestException;
import com.salonpos.repository.CustomerRepository;
import com.salonpos.repository.CustomerSessionRepository;
import com.salonpos.security.JwtService;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class CustomerAuthService {

    private final OtpChallengeService otpChallengeService;
    private final CustomerRepository customerRepository;
    private final CustomerSessionRepository customerSessionRepository;
    private final EmailAddressService emailAddressService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final NotificationProperties notificationProperties;
    private final CustomerService customerService;
    private final AppointmentService appointmentService;
    private final AuditLogService auditLogService;
    private final SecureRandom secureRandom = new SecureRandom();

    public CustomerAuthService(
        OtpChallengeService otpChallengeService,
        CustomerRepository customerRepository,
        CustomerSessionRepository customerSessionRepository,
        EmailAddressService emailAddressService,
        PasswordEncoder passwordEncoder,
        JwtService jwtService,
        NotificationProperties notificationProperties,
        CustomerService customerService,
        AppointmentService appointmentService,
        AuditLogService auditLogService
    ) {
        this.otpChallengeService = otpChallengeService;
        this.customerRepository = customerRepository;
        this.customerSessionRepository = customerSessionRepository;
        this.emailAddressService = emailAddressService;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.notificationProperties = notificationProperties;
        this.customerService = customerService;
        this.appointmentService = appointmentService;
        this.auditLogService = auditLogService;
    }

    public OtpChallengeResponse requestOtp(CustomerOtpRequest request) {
        return otpChallengeService.issue(request.email(), CustomerOtpPurpose.LOGIN, null);
    }

    @Transactional
    public CustomerAuthResponse verifyOtp(CustomerOtpVerifyRequest request) {
        otpChallengeService.verify(request.email(), CustomerOtpPurpose.LOGIN, null, request.otpCode().trim());
        String normalizedEmail = emailAddressService.normalize(request.email());

        Customer customer = customerService.findUniqueByEmail(normalizedEmail)
            .orElseGet(() -> createCustomerFromEmail(request.email(), normalizedEmail));

        appointmentService.attachGuestAppointmentsToCustomer(customer);
        String refreshToken = createRefreshToken(customer, request.deviceLabel());
        String accessToken = jwtService.generateCustomerToken(customer.getId());
        CustomerResponse customerResponse = customerService.toResponse(customer);
        auditLogService.log("CUSTOMER_AUTH_VERIFIED", "customer", customer.getId(), null, customerResponse);
        return new CustomerAuthResponse(accessToken, refreshToken, "Bearer", jwtService.getExpirationSeconds(), customerResponse);
    }

    @Transactional
    public CustomerAuthResponse refresh(CustomerTokenRefreshRequest request) {
        CustomerSession session = resolveRefreshToken(request.refreshToken());
        if (session.getExpiresAt().isBefore(OffsetDateTime.now())) {
            throw new BadRequestException("Refresh token expired.");
        }

        String nextRefreshToken = rotateRefreshToken(session);
        String accessToken = jwtService.generateCustomerToken(session.getCustomer().getId());
        return new CustomerAuthResponse(
            accessToken,
            nextRefreshToken,
            "Bearer",
            jwtService.getExpirationSeconds(),
            customerService.toResponse(session.getCustomer())
        );
    }

    @Transactional
    public void logout(CustomerLogoutRequest request) {
        CustomerSession session = resolveRefreshToken(request.refreshToken());
        session.setRevokedAt(OffsetDateTime.now());
        customerSessionRepository.save(session);
    }

    private Customer createCustomerFromEmail(String rawEmail, String normalizedEmail) {
        Customer seeded = customerService.seedFromGuestHistoryByEmail(normalizedEmail);
        if (seeded != null) {
            return customerRepository.save(seeded);
        }

        Customer customer = new Customer();
        customer.setName(defaultNameFromEmail(normalizedEmail));
        customer.setEmail(normalizedEmail);
        customer.setStatus("ACTIVE");
        customer.setPointsBalance(0);
        customer.setTotalSpend(BigDecimal.ZERO.setScale(2));
        customer.setTotalVisits(0);
        customer.setMarketingOptIn(false);
        customer.setCreatedAt(OffsetDateTime.now());
        customer.setUpdatedAt(OffsetDateTime.now());
        return customerRepository.save(customer);
    }

    private String defaultNameFromEmail(String normalizedEmail) {
        int atIndex = normalizedEmail.indexOf('@');
        String localPart = atIndex > 0 ? normalizedEmail.substring(0, atIndex) : normalizedEmail;
        String sanitized = localPart.replace('.', ' ').replace('_', ' ').trim();
        if (sanitized.isBlank()) {
            return "Customer";
        }
        return Character.toUpperCase(sanitized.charAt(0)) + sanitized.substring(1);
    }

    private String createRefreshToken(Customer customer, String deviceLabel) {
        CustomerSession session = new CustomerSession();
        session.setCustomer(customer);
        session.setRefreshTokenHash("pending");
        session.setExpiresAt(OffsetDateTime.now().plusSeconds(notificationProperties.getCustomerRefreshTtlSeconds()));
        session.setDeviceLabel(deviceLabel == null || deviceLabel.isBlank() ? null : deviceLabel.trim());
        session.setCreatedAt(OffsetDateTime.now());
        CustomerSession saved = customerSessionRepository.save(session);
        return rotateRefreshToken(saved);
    }

    private String rotateRefreshToken(CustomerSession session) {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        String secret = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        session.setRefreshTokenHash(passwordEncoder.encode(secret));
        session.setRevokedAt(null);
        customerSessionRepository.save(session);
        return session.getId() + "." + secret;
    }

    private CustomerSession resolveRefreshToken(String refreshToken) {
        String token = refreshToken == null ? "" : refreshToken.trim();
        int separator = token.indexOf('.');
        if (separator <= 0 || separator == token.length() - 1) {
            throw new BadRequestException("Invalid refresh token.");
        }

        Long sessionId;
        try {
            sessionId = Long.parseLong(token.substring(0, separator));
        } catch (NumberFormatException ex) {
            throw new BadRequestException("Invalid refresh token.");
        }
        String secret = token.substring(separator + 1);

        CustomerSession session = customerSessionRepository.findByIdAndRevokedAtIsNull(sessionId)
            .orElseThrow(() -> new BadRequestException("Refresh session not found."));

        if (!passwordEncoder.matches(secret, session.getRefreshTokenHash())) {
            throw new BadRequestException("Invalid refresh token.");
        }
        return session;
    }
}
