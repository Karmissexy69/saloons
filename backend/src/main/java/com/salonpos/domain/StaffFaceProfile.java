package com.salonpos.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "staff_face_profiles")
public class StaffFaceProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "staff_id", nullable = false)
    private StaffProfile staff;

    @Column(name = "rekognition_collection_id", nullable = false)
    private String rekognitionCollectionId;

    @Column(name = "rekognition_face_id", nullable = false)
    private String rekognitionFaceId;

    @Column(name = "rekognition_external_image_id", nullable = false)
    private String rekognitionExternalImageId;

    @Column(name = "s3_enrollment_key", nullable = false)
    private String s3EnrollmentKey;

    @Column(name = "quality_score")
    private BigDecimal qualityScore;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
