package com.salonpos.service.biometric;

import com.salonpos.config.BiometricProperties;
import com.salonpos.domain.AttendanceFaceVerification;
import com.salonpos.repository.AttendanceFaceVerificationRepository;
import jakarta.transaction.Transactional;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class ProbeImageCleanupScheduler {

    private static final Logger log = LoggerFactory.getLogger(ProbeImageCleanupScheduler.class);

    private final AttendanceFaceVerificationRepository attendanceFaceVerificationRepository;
    private final FaceStorageService faceStorageService;
    private final BiometricProperties biometricProperties;

    public ProbeImageCleanupScheduler(
        AttendanceFaceVerificationRepository attendanceFaceVerificationRepository,
        FaceStorageService faceStorageService,
        BiometricProperties biometricProperties
    ) {
        this.attendanceFaceVerificationRepository = attendanceFaceVerificationRepository;
        this.faceStorageService = faceStorageService;
        this.biometricProperties = biometricProperties;
    }

    @Transactional
    @Scheduled(cron = "0 15 3 * * *")
    public void purgeProbeImagesMonthly() {
        OffsetDateTime nowUtc = OffsetDateTime.now(ZoneOffset.UTC);
        if (nowUtc.getDayOfMonth() != biometricProperties.getProbePurgeDayOfMonth()) {
            return;
        }

        OffsetDateTime monthStart = nowUtc.withDayOfMonth(1).toLocalDate().atStartOfDay().atOffset(ZoneOffset.UTC);
        List<AttendanceFaceVerification> staleProbeImages = attendanceFaceVerificationRepository
            .findByS3ProbeImageKeyIsNotNullAndCreatedAtBefore(monthStart);

        for (AttendanceFaceVerification verification : staleProbeImages) {
            faceStorageService.deleteObjectQuietly(verification.getS3ProbeImageKey());
            verification.setS3ProbeImageKey(null);
        }

        attendanceFaceVerificationRepository.saveAll(staleProbeImages);
        if (!staleProbeImages.isEmpty()) {
            log.info("Purged {} attendance probe images from storage", staleProbeImages.size());
        }
    }
}
