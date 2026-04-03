package com.salonpos.service.biometric;

import com.salonpos.config.BiometricProperties;
import java.time.YearMonth;
import java.util.Locale;
import java.util.UUID;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

@Service
public class S3FaceStorageService implements FaceStorageService {

    private final S3Client s3Client;
    private final BiometricProperties biometricProperties;

    public S3FaceStorageService(S3Client s3Client, BiometricProperties biometricProperties) {
        this.s3Client = s3Client;
        this.biometricProperties = biometricProperties;
    }

    @Override
    public String storeEnrollmentPhoto(Long staffId, byte[] imageBytes, String contentType) {
        String key = "staff-faces/%d/enrollment/%s%s".formatted(staffId, UUID.randomUUID(), extension(contentType));
        put(key, imageBytes, contentType);
        return key;
    }

    @Override
    public String storeProbePhoto(Long staffId, byte[] imageBytes, String contentType) {
        YearMonth ym = YearMonth.now();
        String key = "staff-faces/%d/probe/%d/%02d/%s%s"
            .formatted(staffId, ym.getYear(), ym.getMonthValue(), UUID.randomUUID(), extension(contentType));
        put(key, imageBytes, contentType);
        return key;
    }

    @Override
    public void deleteObjectQuietly(String key) {
        if (key == null || key.isBlank()) {
            return;
        }

        try {
            s3Client.deleteObject(DeleteObjectRequest.builder()
                .bucket(biometricProperties.getS3BiometricBucket())
                .key(key)
                .build());
        } catch (RuntimeException ignored) {
            // Best-effort cleanup; do not fail business flow.
        }
    }

    private void put(String key, byte[] imageBytes, String contentType) {
        PutObjectRequest.Builder requestBuilder = PutObjectRequest.builder()
            .bucket(biometricProperties.getS3BiometricBucket())
            .key(key);

        if (contentType != null && !contentType.isBlank()) {
            requestBuilder.contentType(contentType);
        }

        s3Client.putObject(requestBuilder.build(), RequestBody.fromBytes(imageBytes));
    }

    private String extension(String contentType) {
        if (contentType == null || contentType.isBlank()) {
            return ".jpg";
        }

        String normalized = contentType.toLowerCase(Locale.ROOT);
        if (normalized.contains("png")) {
            return ".png";
        }
        if (normalized.contains("jpeg") || normalized.contains("jpg")) {
            return ".jpg";
        }
        if (normalized.contains("webp")) {
            return ".webp";
        }
        return ".jpg";
    }
}
