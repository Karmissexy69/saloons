package com.salonpos.service;

import com.salonpos.config.PaymentProofProperties;
import com.salonpos.domain.Branch;
import java.util.Locale;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

@Service
public class PaymentProofStorageService {

    private final S3Client s3Client;
    private final PaymentProofProperties paymentProofProperties;

    public PaymentProofStorageService(S3Client s3Client, PaymentProofProperties paymentProofProperties) {
        this.s3Client = s3Client;
        this.paymentProofProperties = paymentProofProperties;
    }

    public String store(Branch branch, String receiptNo, byte[] imageBytes, String contentType) {
        String branchSegment = sanitize(branch.getName().isBlank() ? "branch-" + branch.getId() : branch.getName());
        String key = "%s/%s/receipts/%s%s".formatted(
            trimSlashes(paymentProofProperties.getKeyPrefix()),
            branchSegment,
            receiptNo,
            extension(contentType)
        );

        PutObjectRequest.Builder request = PutObjectRequest.builder()
            .bucket(paymentProofProperties.getS3Bucket())
            .key(key);

        if (contentType != null && !contentType.isBlank()) {
            request.contentType(contentType);
        }

        s3Client.putObject(request.build(), RequestBody.fromBytes(imageBytes));
        return key;
    }

    public void deleteQuietly(String key) {
        if (key == null || key.isBlank()) {
            return;
        }

        try {
            s3Client.deleteObject(DeleteObjectRequest.builder()
                .bucket(paymentProofProperties.getS3Bucket())
                .key(key)
                .build());
        } catch (RuntimeException ignored) {
            // Best-effort cleanup; transaction flow should not fail on delete.
        }
    }

    private String trimSlashes(String value) {
        return value == null ? "payment-proofs" : value.replaceAll("^/+", "").replaceAll("/+$", "");
    }

    private String sanitize(String value) {
        String normalized = value.toLowerCase(Locale.ROOT).trim().replaceAll("[^a-z0-9]+", "-");
        return normalized.isBlank() ? "branch" : normalized.replaceAll("^-+|-+$", "");
    }

    private String extension(String contentType) {
        if (contentType == null || contentType.isBlank()) {
            return ".jpg";
        }

        String normalized = contentType.toLowerCase(Locale.ROOT);
        if (normalized.contains("png")) {
            return ".png";
        }
        if (normalized.contains("webp")) {
            return ".webp";
        }
        return ".jpg";
    }
}
