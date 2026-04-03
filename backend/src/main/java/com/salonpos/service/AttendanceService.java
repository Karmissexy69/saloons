package com.salonpos.service;

import com.salonpos.config.BiometricProperties;
import com.salonpos.domain.AppUser;
import com.salonpos.domain.AttendanceFaceVerification;
import com.salonpos.domain.AttendanceLog;
import com.salonpos.domain.AttendanceStatus;
import com.salonpos.domain.FaceMatchResult;
import com.salonpos.domain.FaceVerificationFailureReason;
import com.salonpos.domain.StaffProfile;
import com.salonpos.dto.AttendanceActionRequest;
import com.salonpos.dto.AttendanceClockInRequest;
import com.salonpos.dto.AttendanceClockOutRequest;
import com.salonpos.dto.AttendanceLogResponse;
import com.salonpos.dto.AttendanceReportItemResponse;
import com.salonpos.dto.FaceVerificationResponse;
import com.salonpos.exception.BadRequestException;
import com.salonpos.exception.NotFoundException;
import com.salonpos.repository.AppUserRepository;
import com.salonpos.repository.AttendanceFaceVerificationRepository;
import com.salonpos.repository.AttendanceLogRepository;
import com.salonpos.repository.StaffFaceProfileRepository;
import com.salonpos.repository.StaffProfileRepository;
import com.salonpos.service.biometric.FaceImageService;
import com.salonpos.service.biometric.FaceRecognitionService;
import com.salonpos.service.biometric.FaceSearchResult;
import com.salonpos.service.biometric.FaceStorageService;
import com.salonpos.service.biometric.FaceVerificationTokenClaims;
import com.salonpos.service.biometric.FaceVerificationTokenService;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Objects;
import java.util.UUID;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import com.salonpos.dto.PagedResponse;

@Service
public class AttendanceService {

    private final AttendanceLogRepository attendanceLogRepository;
    private final StaffProfileRepository staffProfileRepository;
    private final StaffFaceProfileRepository staffFaceProfileRepository;
    private final AttendanceFaceVerificationRepository attendanceFaceVerificationRepository;
    private final AppUserRepository appUserRepository;
    private final FaceImageService faceImageService;
    private final FaceStorageService faceStorageService;
    private final FaceRecognitionService faceRecognitionService;
    private final FaceVerificationTokenService faceVerificationTokenService;
    private final BiometricProperties biometricProperties;
    private final AuditLogService auditLogService;

    public AttendanceService(
        AttendanceLogRepository attendanceLogRepository,
        StaffProfileRepository staffProfileRepository,
        StaffFaceProfileRepository staffFaceProfileRepository,
        AttendanceFaceVerificationRepository attendanceFaceVerificationRepository,
        AppUserRepository appUserRepository,
        FaceImageService faceImageService,
        FaceStorageService faceStorageService,
        FaceRecognitionService faceRecognitionService,
        FaceVerificationTokenService faceVerificationTokenService,
        BiometricProperties biometricProperties,
        AuditLogService auditLogService
    ) {
        this.attendanceLogRepository = attendanceLogRepository;
        this.staffProfileRepository = staffProfileRepository;
        this.staffFaceProfileRepository = staffFaceProfileRepository;
        this.attendanceFaceVerificationRepository = attendanceFaceVerificationRepository;
        this.appUserRepository = appUserRepository;
        this.faceImageService = faceImageService;
        this.faceStorageService = faceStorageService;
        this.faceRecognitionService = faceRecognitionService;
        this.faceVerificationTokenService = faceVerificationTokenService;
        this.biometricProperties = biometricProperties;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public FaceVerificationResponse verifyFace(Long staffId, MultipartFile selfie) {
        enforceAttendanceActor(staffId);

        StaffProfile staff = staffProfileRepository.findById(staffId)
            .orElseThrow(() -> new NotFoundException("Staff not found: " + staffId));

        BigDecimal threshold = biometricProperties.getFaceMatchThreshold();
        if (staffFaceProfileRepository.findFirstByStaffIdAndActiveTrue(staffId).isEmpty()) {
            AttendanceFaceVerification failed = createVerification(staff, threshold);
            failed.setMatchResult(FaceMatchResult.FAIL);
            failed.setFailureReason(FaceVerificationFailureReason.STAFF_FACE_PROFILE_NOT_FOUND.name());
            failed = attendanceFaceVerificationRepository.save(failed);

            FaceVerificationResponse response = new FaceVerificationResponse(
                false,
                FaceVerificationFailureReason.STAFF_FACE_PROFILE_NOT_FOUND.name(),
                threshold,
                null,
                null,
                failed.getId()
            );
            auditLogService.log("ATTENDANCE_FACE_VERIFY", "attendance_face_verification", failed.getId(), null, response);
            return response;
        }

        byte[] selfieBytes = faceImageService.readImageBytes(selfie, "selfie");
        String probeKey = faceStorageService.storeProbePhoto(staffId, selfieBytes, selfie.getContentType());
        FaceSearchResult searchResult = faceRecognitionService.verifyStaffFace(staffId, selfieBytes, threshold);

        AttendanceFaceVerification verification = createVerification(staff, threshold);
        verification.setS3ProbeImageKey(probeKey);
        verification.setSimilarity(searchResult.similarity());
        verification.setRekognitionRequestId(searchResult.rekognitionRequestId());

        if (!searchResult.matched()) {
            verification.setMatchResult(FaceMatchResult.FAIL);
            verification.setFailureReason(searchResult.failureReason().name());
            verification = attendanceFaceVerificationRepository.save(verification);

            FaceVerificationResponse response = new FaceVerificationResponse(
                false,
                searchResult.failureReason().name(),
                threshold,
                searchResult.similarity(),
                null,
                verification.getId()
            );
            auditLogService.log("ATTENDANCE_FACE_VERIFY", "attendance_face_verification", verification.getId(), null, response);
            return response;
        }

        verification.setMatchResult(FaceMatchResult.PASS);
        verification = attendanceFaceVerificationRepository.save(verification);

        UUID tokenId = UUID.randomUUID();
        OffsetDateTime issuedAt = OffsetDateTime.now();
        String verificationToken = faceVerificationTokenService.generate(staffId, verification.getId(), tokenId, issuedAt);

        verification.setVerificationTokenId(tokenId);
        verification.setTokenExpiresAt(issuedAt.plusMinutes(biometricProperties.getVerificationTokenTtlMinutes()));
        verification = attendanceFaceVerificationRepository.save(verification);

        FaceVerificationResponse response = new FaceVerificationResponse(
            true,
            null,
            threshold,
            searchResult.similarity(),
            verificationToken,
            verification.getId()
        );
        auditLogService.log("ATTENDANCE_FACE_VERIFY", "attendance_face_verification", verification.getId(), null, response);
        return response;
    }

    @Transactional
    public AttendanceLogResponse clockIn(AttendanceClockInRequest request) {
        enforceAttendanceActor(request.staffId());
        AttendanceFaceVerification verification = validateVerificationToken(request.staffId(), request.verificationToken());

        StaffProfile staff = staffProfileRepository.findById(request.staffId())
            .orElseThrow(() -> new NotFoundException("Staff not found: " + request.staffId()));

        AttendanceLog log = createClockInLog(staff, request.branchId());
        verification.setAttendance(log);
        verification.setTokenUsedAt(OffsetDateTime.now());
        attendanceFaceVerificationRepository.save(verification);

        AttendanceLogResponse response = toResponse(log);
        auditLogService.log("ATTENDANCE_CLOCK_IN", "attendance_log", response.id(), null, response);
        return response;
    }

    @Transactional
    public AttendanceLogResponse breakStart(AttendanceActionRequest request) {
        enforceAttendanceActor(request.staffId());
        AttendanceLog log = getOpenLog(request.staffId());
        if (log.getCurrentBreakStartAt() != null) {
            throw new BadRequestException("Break already started.");
        }
        log.setCurrentBreakStartAt(OffsetDateTime.now());
        log.setAttendanceStatus(AttendanceStatus.ON_BREAK);
        AttendanceLogResponse response = toResponse(attendanceLogRepository.save(log));
        auditLogService.log("ATTENDANCE_BREAK_START", "attendance_log", response.id(), null, response);
        return response;
    }

    @Transactional
    public AttendanceLogResponse breakEnd(AttendanceActionRequest request) {
        enforceAttendanceActor(request.staffId());
        AttendanceLog log = getOpenLog(request.staffId());
        if (log.getCurrentBreakStartAt() == null) {
            throw new BadRequestException("No active break found.");
        }

        int breakAdded = (int) Duration.between(log.getCurrentBreakStartAt(), OffsetDateTime.now()).toMinutes();
        log.setBreakMinutes(log.getBreakMinutes() + Math.max(0, breakAdded));
        log.setCurrentBreakStartAt(null);
        log.setAttendanceStatus(AttendanceStatus.CLOCKED_IN);
        AttendanceLogResponse response = toResponse(attendanceLogRepository.save(log));
        auditLogService.log("ATTENDANCE_BREAK_END", "attendance_log", response.id(), null, response);
        return response;
    }

    @Transactional
    public AttendanceLogResponse clockOut(AttendanceClockOutRequest request) {
        enforceAttendanceActor(request.staffId());
        AttendanceFaceVerification verification = validateVerificationToken(request.staffId(), request.verificationToken());
        AttendanceLog log = getOpenLog(request.staffId());

        if (log.getCurrentBreakStartAt() != null) {
            int breakAdded = (int) Duration.between(log.getCurrentBreakStartAt(), OffsetDateTime.now()).toMinutes();
            log.setBreakMinutes(log.getBreakMinutes() + Math.max(0, breakAdded));
            log.setCurrentBreakStartAt(null);
        }

        log.setClockOutAt(OffsetDateTime.now());
        log.setAttendanceStatus(AttendanceStatus.CLOCKED_OUT);
        AttendanceLogResponse response = toResponse(attendanceLogRepository.save(log));
        verification.setAttendance(log);
        verification.setTokenUsedAt(OffsetDateTime.now());
        attendanceFaceVerificationRepository.save(verification);
        auditLogService.log("ATTENDANCE_CLOCK_OUT", "attendance_log", response.id(), null, response);
        return response;
    }

    public PagedResponse<AttendanceReportItemResponse> report(
        Long staffId,
        Long branchId,
        LocalDate from,
        LocalDate to,
        int page,
        int size
    ) {
        OffsetDateTime fromAt = from == null
            ? OffsetDateTime.of(1970, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC)
            : from.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime toAt = to == null
            ? OffsetDateTime.of(9999, 12, 31, 23, 59, 59, 999_999_999, ZoneOffset.UTC)
            : to.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC).minusNanos(1);

        if (toAt.isBefore(fromAt)) {
            throw new BadRequestException("Invalid date range: 'to' must be on or after 'from'.");
        }

        Page<AttendanceLog> result = attendanceLogRepository.search(
            staffId,
            branchId,
            fromAt,
            toAt,
            PageRequest.of(page, size)
        );

        return new PagedResponse<>(
            result.getContent().stream().map(this::toReportItem).toList(),
            page,
            size,
            result.getTotalElements(),
            result.getTotalPages()
        );
    }

    private AttendanceFaceVerification validateVerificationToken(Long staffId, String verificationToken) {
        FaceVerificationTokenClaims tokenClaims = faceVerificationTokenService.parse(verificationToken);
        if (!Objects.equals(tokenClaims.staffId(), staffId)) {
            throw new BadRequestException("Verification token does not match the staffId.");
        }

        AttendanceFaceVerification verification = attendanceFaceVerificationRepository.findByVerificationTokenId(tokenClaims.tokenId())
            .orElseThrow(() -> new BadRequestException("Face verification record not found for this token."));

        if (!Objects.equals(verification.getId(), tokenClaims.verificationId())) {
            throw new BadRequestException("Verification token is invalid.");
        }
        if (verification.getMatchResult() != FaceMatchResult.PASS) {
            throw new BadRequestException("Face verification did not pass.");
        }
        if (verification.getTokenUsedAt() != null) {
            throw new BadRequestException("Verification token already used.");
        }
        if (verification.getTokenExpiresAt() == null || verification.getTokenExpiresAt().isBefore(OffsetDateTime.now())) {
            throw new BadRequestException("Verification token has expired.");
        }
        return verification;
    }

    private AttendanceFaceVerification createVerification(StaffProfile staff, BigDecimal threshold) {
        AttendanceFaceVerification verification = new AttendanceFaceVerification();
        verification.setStaff(staff);
        verification.setThreshold(threshold);
        verification.setCreatedAt(OffsetDateTime.now());
        return verification;
    }

    private AttendanceLog createClockInLog(StaffProfile staff, Long branchId) {
        attendanceLogRepository.findFirstByStaffIdAndClockOutAtIsNullOrderByClockInAtDesc(staff.getId())
            .ifPresent(existing -> {
                throw new BadRequestException("Staff is already clocked in.");
            });

        if (branchId == null) {
            throw new BadRequestException("branchId is required for clock-in.");
        }

        AttendanceLog log = new AttendanceLog();
        log.setStaff(staff);
        log.setBranchId(branchId);
        log.setClockInAt(OffsetDateTime.now());
        log.setAttendanceStatus(AttendanceStatus.CLOCKED_IN);
        log.setBreakMinutes(0);
        log.setCreatedAt(OffsetDateTime.now());
        return attendanceLogRepository.save(log);
    }

    private AttendanceLog getOpenLog(Long staffId) {
        staffProfileRepository.findById(staffId)
            .orElseThrow(() -> new NotFoundException("Staff not found: " + staffId));

        return attendanceLogRepository.findFirstByStaffIdAndClockOutAtIsNullOrderByClockInAtDesc(staffId)
            .orElseThrow(() -> new NotFoundException("No active attendance log found for staff: " + staffId));
    }

    private void enforceAttendanceActor(Long requestedStaffId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            throw new BadRequestException("Authenticated user is required.");
        }

        boolean attendanceTerminal = authentication.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .anyMatch("ROLE_ATTENDANCE_TERMINAL"::equals);
        if (attendanceTerminal) {
            return;
        }

        AppUser appUser = appUserRepository.findByUsername(authentication.getName())
            .orElseThrow(() -> new BadRequestException("Authenticated user could not be resolved."));

        if (appUser.getStaffProfile() == null) {
            throw new BadRequestException("Authenticated user is not linked to a staff profile for self clock-in.");
        }

        if (!Objects.equals(appUser.getStaffProfile().getId(), requestedStaffId)) {
            throw new BadRequestException("Self clock-in only: staffId must match your linked staff profile.");
        }
    }

    private AttendanceLogResponse toResponse(AttendanceLog log) {
        return new AttendanceLogResponse(
            log.getId(),
            log.getStaff().getId(),
            log.getBranchId(),
            log.getClockInAt(),
            log.getClockOutAt(),
            log.getBreakMinutes(),
            log.getAttendanceStatus());
    }

    private AttendanceReportItemResponse toReportItem(AttendanceLog log) {
        Integer workedMinutes = null;
        if (log.getClockOutAt() != null) {
            int totalMinutes = (int) Duration.between(log.getClockInAt(), log.getClockOutAt()).toMinutes();
            workedMinutes = Math.max(0, totalMinutes - Math.max(0, log.getBreakMinutes() == null ? 0 : log.getBreakMinutes()));
        }

        return new AttendanceReportItemResponse(
            log.getId(),
            log.getStaff().getId(),
            log.getStaff().getDisplayName(),
            log.getBranchId(),
            log.getClockInAt(),
            log.getClockOutAt(),
            log.getBreakMinutes(),
            workedMinutes,
            log.getAttendanceStatus()
        );
    }
}
