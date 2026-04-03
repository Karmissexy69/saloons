package com.salonpos.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "attendance_face_verifications")
public class AttendanceFaceVerification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "staff_id", nullable = false)
    private StaffProfile staff;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attendance_id")
    private AttendanceLog attendance;

    @Column(precision = 5, scale = 2)
    private BigDecimal similarity;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal threshold;

    @Enumerated(EnumType.STRING)
    @Column(name = "match_result", nullable = false)
    private FaceMatchResult matchResult;

    @Column(name = "failure_reason")
    private String failureReason;

    @Column(name = "rekognition_request_id")
    private String rekognitionRequestId;

    @Column(name = "s3_probe_image_key")
    private String s3ProbeImageKey;

    @Column(name = "verification_token_id")
    private UUID verificationTokenId;

    @Column(name = "token_expires_at")
    private OffsetDateTime tokenExpiresAt;

    @Column(name = "token_used_at")
    private OffsetDateTime tokenUsedAt;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;
}
