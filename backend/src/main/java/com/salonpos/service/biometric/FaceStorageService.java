package com.salonpos.service.biometric;

public interface FaceStorageService {

    String storeEnrollmentPhoto(Long staffId, byte[] imageBytes, String contentType);

    String storeProbePhoto(Long staffId, byte[] imageBytes, String contentType);

    void deleteObjectQuietly(String key);
}
