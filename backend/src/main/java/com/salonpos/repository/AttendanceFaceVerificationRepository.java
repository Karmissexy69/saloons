package com.salonpos.repository;

import com.salonpos.domain.AttendanceFaceVerification;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AttendanceFaceVerificationRepository extends JpaRepository<AttendanceFaceVerification, Long> {

    Optional<AttendanceFaceVerification> findByVerificationTokenId(UUID verificationTokenId);

    List<AttendanceFaceVerification> findByS3ProbeImageKeyIsNotNullAndCreatedAtBefore(OffsetDateTime threshold);
}
