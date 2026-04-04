package com.salonpos.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "customer_otp_challenges")
public class CustomerOtpChallenge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String email;

    @Column(name = "email_normalized")
    private String emailNormalized;

    @Column(name = "otp_hash", nullable = false)
    private String otpHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CustomerOtpPurpose purpose;

    @Column(name = "reference_value")
    private String referenceValue;

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;

    @Column(name = "attempt_count", nullable = false)
    private int attemptCount;

    @Column(name = "max_attempts", nullable = false)
    private int maxAttempts;

    @Column(name = "consumed_at")
    private OffsetDateTime consumedAt;

    @Column(nullable = false)
    private String channel;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;
}
