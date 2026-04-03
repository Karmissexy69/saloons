package com.salonpos.service.biometric;

import java.math.BigDecimal;

public interface FaceRecognitionService {

    FaceEnrollmentResult enrollStaffFace(Long staffId, byte[] imageBytes);

    void deleteFace(String faceId);

    FaceSearchResult verifyStaffFace(Long expectedStaffId, byte[] imageBytes, BigDecimal threshold);
}
