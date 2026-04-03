package com.salonpos.service.biometric;

import com.salonpos.config.BiometricProperties;
import com.salonpos.domain.FaceVerificationFailureReason;
import com.salonpos.exception.BadRequestException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.services.rekognition.RekognitionClient;
import software.amazon.awssdk.services.rekognition.model.DetectFacesRequest;
import software.amazon.awssdk.services.rekognition.model.DetectFacesResponse;
import software.amazon.awssdk.services.rekognition.model.FaceDetail;
import software.amazon.awssdk.services.rekognition.model.FaceMatch;
import software.amazon.awssdk.services.rekognition.model.Image;
import software.amazon.awssdk.services.rekognition.model.IndexFacesRequest;
import software.amazon.awssdk.services.rekognition.model.IndexFacesResponse;
import software.amazon.awssdk.services.rekognition.model.RekognitionException;
import software.amazon.awssdk.services.rekognition.model.SearchFacesByImageRequest;
import software.amazon.awssdk.services.rekognition.model.SearchFacesByImageResponse;

@Service
public class AwsRekognitionFaceRecognitionService implements FaceRecognitionService {

    private final RekognitionClient rekognitionClient;
    private final BiometricProperties biometricProperties;

    public AwsRekognitionFaceRecognitionService(
        RekognitionClient rekognitionClient,
        BiometricProperties biometricProperties
    ) {
        this.rekognitionClient = rekognitionClient;
        this.biometricProperties = biometricProperties;
    }

    @Override
    public FaceEnrollmentResult enrollStaffFace(Long staffId, byte[] imageBytes) {
        FaceCountResult faceCountResult = countFaces(imageBytes);
        if (faceCountResult.count == 0) {
            throw new BadRequestException("No face detected in enrollment image.");
        }
        if (faceCountResult.count > 1) {
            throw new BadRequestException("Enrollment image must contain exactly one face.");
        }

        try {
            IndexFacesResponse response = rekognitionClient.indexFaces(IndexFacesRequest.builder()
                .collectionId(biometricProperties.getRekognitionCollectionId())
                .externalImageId(String.valueOf(staffId))
                .maxFaces(1)
                .image(imageFrom(imageBytes))
                .build());

            if (response.faceRecords() == null || response.faceRecords().isEmpty()) {
                throw new BadRequestException("Unable to index face for this staff profile.");
            }

            String faceId = response.faceRecords().getFirst().face().faceId();
            String externalImageId = response.faceRecords().getFirst().face().externalImageId();

            BigDecimal qualityScore = null;
            FaceDetail faceDetail = response.faceRecords().getFirst().faceDetail();
            if (faceDetail != null && faceDetail.quality() != null && faceDetail.quality().sharpness() != null) {
                qualityScore = decimal(faceDetail.quality().sharpness());
            }

            return new FaceEnrollmentResult(faceId, externalImageId, qualityScore);
        } catch (RekognitionException ex) {
            throw new BadRequestException("Face enrollment failed via Rekognition: " + errorMessage(ex));
        }
    }

    @Override
    public void deleteFace(String faceId) {
        if (faceId == null || faceId.isBlank()) {
            return;
        }

        try {
            rekognitionClient.deleteFaces(builder -> builder
                .collectionId(biometricProperties.getRekognitionCollectionId())
                .faceIds(faceId));
        } catch (RuntimeException ignored) {
            // Best-effort cleanup.
        }
    }

    @Override
    public FaceSearchResult verifyStaffFace(Long expectedStaffId, byte[] imageBytes, BigDecimal threshold) {
        FaceCountResult faceCountResult;
        try {
            faceCountResult = countFaces(imageBytes);
        } catch (BadRequestException ex) {
            return new FaceSearchResult(false, null, null, FaceVerificationFailureReason.AWS_REKOGNITION_UNAVAILABLE);
        }
        if (faceCountResult.count == 0) {
            return new FaceSearchResult(false, null, faceCountResult.requestId, FaceVerificationFailureReason.NO_FACE_DETECTED);
        }
        if (faceCountResult.count > 1) {
            return new FaceSearchResult(false, null, faceCountResult.requestId, FaceVerificationFailureReason.MULTIPLE_FACES_DETECTED);
        }

        try {
            SearchFacesByImageResponse response = rekognitionClient.searchFacesByImage(SearchFacesByImageRequest.builder()
                .collectionId(biometricProperties.getRekognitionCollectionId())
                .image(imageFrom(imageBytes))
                .maxFaces(5)
                .faceMatchThreshold(0f)
                .build());

            if (response.faceMatches() == null || response.faceMatches().isEmpty()) {
                return new FaceSearchResult(false, null, requestId(response), FaceVerificationFailureReason.LOW_SIMILARITY);
            }

            List<FaceMatch> sortedMatches = response.faceMatches().stream()
                .sorted(Comparator.comparing(FaceMatch::similarity).reversed())
                .toList();

            FaceMatch best = sortedMatches.getFirst();
            BigDecimal similarity = decimal(best.similarity());
            String matchedExternalImageId = best.face() == null ? null : best.face().externalImageId();
            if (!String.valueOf(expectedStaffId).equals(matchedExternalImageId)) {
                return new FaceSearchResult(false, similarity, requestId(response), FaceVerificationFailureReason.MATCHED_OTHER_STAFF);
            }

            if (similarity.compareTo(threshold) < 0) {
                return new FaceSearchResult(false, similarity, requestId(response), FaceVerificationFailureReason.LOW_SIMILARITY);
            }

            return new FaceSearchResult(true, similarity, requestId(response), null);
        } catch (RekognitionException ex) {
            return new FaceSearchResult(false, null, null, FaceVerificationFailureReason.AWS_REKOGNITION_UNAVAILABLE);
        }
    }

    private FaceCountResult countFaces(byte[] imageBytes) {
        try {
            DetectFacesResponse detectFacesResponse = rekognitionClient.detectFaces(DetectFacesRequest.builder()
                .image(imageFrom(imageBytes))
                .build());

            int count = detectFacesResponse.faceDetails() == null ? 0 : detectFacesResponse.faceDetails().size();
            return new FaceCountResult(count, requestId(detectFacesResponse));
        } catch (RekognitionException ex) {
            throw new BadRequestException("Failed to analyze image via Rekognition: " + errorMessage(ex));
        }
    }

    private Image imageFrom(byte[] imageBytes) {
        return Image.builder().bytes(SdkBytes.fromByteArray(imageBytes)).build();
    }

    private BigDecimal decimal(Float value) {
        if (value == null) {
            return null;
        }
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP);
    }

    private String requestId(DetectFacesResponse response) {
        return response.responseMetadata() == null ? null : response.responseMetadata().requestId();
    }

    private String requestId(SearchFacesByImageResponse response) {
        return response.responseMetadata() == null ? null : response.responseMetadata().requestId();
    }

    private String errorMessage(RekognitionException ex) {
        if (ex.awsErrorDetails() != null && ex.awsErrorDetails().errorMessage() != null) {
            return ex.awsErrorDetails().errorMessage();
        }
        return ex.getMessage();
    }

    private record FaceCountResult(int count, String requestId) {
    }
}
