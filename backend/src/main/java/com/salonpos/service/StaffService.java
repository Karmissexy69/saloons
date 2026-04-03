package com.salonpos.service;

import com.salonpos.config.BiometricProperties;
import com.salonpos.domain.StaffFaceProfile;
import com.salonpos.domain.StaffProfile;
import com.salonpos.dto.CreateStaffRequest;
import com.salonpos.dto.StaffProfileResponse;
import com.salonpos.dto.StaffCreateResponse;
import com.salonpos.dto.StaffFaceReEnrollResponse;
import com.salonpos.exception.NotFoundException;
import com.salonpos.repository.StaffFaceProfileRepository;
import com.salonpos.repository.StaffProfileRepository;
import com.salonpos.service.biometric.FaceEnrollmentResult;
import com.salonpos.service.biometric.FaceImageService;
import com.salonpos.service.biometric.FaceRecognitionService;
import com.salonpos.service.biometric.FaceStorageService;
import jakarta.transaction.Transactional;
import java.util.List;
import java.time.OffsetDateTime;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.stereotype.Service;

@Service
public class StaffService {

    private final StaffProfileRepository staffProfileRepository;
    private final StaffFaceProfileRepository staffFaceProfileRepository;
    private final FaceImageService faceImageService;
    private final FaceStorageService faceStorageService;
    private final FaceRecognitionService faceRecognitionService;
    private final BiometricProperties biometricProperties;
    private final AuditLogService auditLogService;

    public StaffService(
        StaffProfileRepository staffProfileRepository,
        StaffFaceProfileRepository staffFaceProfileRepository,
        FaceImageService faceImageService,
        FaceStorageService faceStorageService,
        FaceRecognitionService faceRecognitionService,
        BiometricProperties biometricProperties,
        AuditLogService auditLogService
    ) {
        this.staffProfileRepository = staffProfileRepository;
        this.staffFaceProfileRepository = staffFaceProfileRepository;
        this.faceImageService = faceImageService;
        this.faceStorageService = faceStorageService;
        this.faceRecognitionService = faceRecognitionService;
        this.biometricProperties = biometricProperties;
        this.auditLogService = auditLogService;
    }

    public List<StaffProfileResponse> list() {
        return staffProfileRepository.findAll().stream()
            .map(staff -> new StaffProfileResponse(
                staff.getId(),
                staff.getDisplayName(),
                staff.getRoleType(),
                staff.isActive()))
            .toList();
    }

    @Transactional
    public StaffCreateResponse create(CreateStaffRequest request, MultipartFile enrollmentPhoto) {
        byte[] enrollmentImageBytes = faceImageService.readImageBytes(enrollmentPhoto, "enrollmentPhoto");

        StaffProfile staff = new StaffProfile();
        staff.setDisplayName(request.displayName().trim());
        staff.setRoleType(request.roleType().trim().toUpperCase());
        staff.setActive(request.active() == null || request.active());
        staff.setCreatedAt(OffsetDateTime.now());
        staff = staffProfileRepository.save(staff);

        String enrollmentKey = null;
        FaceEnrollmentResult enrollmentResult = null;
        try {
            enrollmentKey = faceStorageService.storeEnrollmentPhoto(staff.getId(), enrollmentImageBytes, enrollmentPhoto.getContentType());
            enrollmentResult = faceRecognitionService.enrollStaffFace(staff.getId(), enrollmentImageBytes);

            StaffFaceProfile faceProfile = new StaffFaceProfile();
            faceProfile.setStaff(staff);
            faceProfile.setRekognitionCollectionId(biometricProperties.getRekognitionCollectionId());
            faceProfile.setRekognitionFaceId(enrollmentResult.faceId());
            faceProfile.setRekognitionExternalImageId(enrollmentResult.externalImageId());
            faceProfile.setS3EnrollmentKey(enrollmentKey);
            faceProfile.setQualityScore(enrollmentResult.qualityScore());
            faceProfile.setActive(true);
            faceProfile.setCreatedAt(OffsetDateTime.now());
            faceProfile.setUpdatedAt(OffsetDateTime.now());
            staffFaceProfileRepository.save(faceProfile);

            StaffCreateResponse response = new StaffCreateResponse(
                staff.getId(),
                staff.getDisplayName(),
                staff.getRoleType(),
                staff.isActive(),
                true
            );
            auditLogService.log("STAFF_CREATE_WITH_FACE", "staff_profile", staff.getId(), null, response);
            return response;
        } catch (RuntimeException ex) {
            if (enrollmentKey != null) {
                faceStorageService.deleteObjectQuietly(enrollmentKey);
            }
            if (enrollmentResult != null) {
                faceRecognitionService.deleteFace(enrollmentResult.faceId());
            }
            throw ex;
        }
    }

    @Transactional
    public StaffFaceReEnrollResponse reEnrollFace(Long staffId, MultipartFile enrollmentPhoto) {
        StaffProfile staff = staffProfileRepository.findById(staffId)
            .orElseThrow(() -> new NotFoundException("Staff not found: " + staffId));

        StaffFaceProfile existingProfile = staffFaceProfileRepository.findFirstByStaffIdAndActiveTrue(staffId)
            .orElseThrow(() -> new NotFoundException("Active face profile not found for staff: " + staffId));

        byte[] imageBytes = faceImageService.readImageBytes(enrollmentPhoto, "enrollmentPhoto");

        String newEnrollmentKey = null;
        FaceEnrollmentResult enrollmentResult = null;
        try {
            newEnrollmentKey = faceStorageService.storeEnrollmentPhoto(staff.getId(), imageBytes, enrollmentPhoto.getContentType());
            enrollmentResult = faceRecognitionService.enrollStaffFace(staff.getId(), imageBytes);

            existingProfile.setActive(false);
            existingProfile.setUpdatedAt(OffsetDateTime.now());
            staffFaceProfileRepository.save(existingProfile);

            StaffFaceProfile newProfile = new StaffFaceProfile();
            newProfile.setStaff(staff);
            newProfile.setRekognitionCollectionId(biometricProperties.getRekognitionCollectionId());
            newProfile.setRekognitionFaceId(enrollmentResult.faceId());
            newProfile.setRekognitionExternalImageId(enrollmentResult.externalImageId());
            newProfile.setS3EnrollmentKey(newEnrollmentKey);
            newProfile.setQualityScore(enrollmentResult.qualityScore());
            newProfile.setActive(true);
            newProfile.setCreatedAt(OffsetDateTime.now());
            newProfile.setUpdatedAt(OffsetDateTime.now());
            StaffFaceProfile savedProfile = staffFaceProfileRepository.save(newProfile);

            faceRecognitionService.deleteFace(existingProfile.getRekognitionFaceId());
            faceStorageService.deleteObjectQuietly(existingProfile.getS3EnrollmentKey());

            StaffFaceReEnrollResponse response = new StaffFaceReEnrollResponse(
                staffId,
                savedProfile.getId(),
                "Face re-enrollment completed"
            );
            auditLogService.log("STAFF_FACE_RE_ENROLL", "staff_profile", staffId, null, response);
            return response;
        } catch (RuntimeException ex) {
            if (newEnrollmentKey != null) {
                faceStorageService.deleteObjectQuietly(newEnrollmentKey);
            }
            if (enrollmentResult != null) {
                faceRecognitionService.deleteFace(enrollmentResult.faceId());
            }
            throw ex;
        }
    }
}
