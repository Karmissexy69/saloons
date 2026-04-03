package com.salonpos.controller;

import com.salonpos.dto.AttendanceActionRequest;
import com.salonpos.dto.AttendanceClockInRequest;
import com.salonpos.dto.AttendanceClockOutRequest;
import com.salonpos.dto.AttendanceLogResponse;
import com.salonpos.dto.AttendanceReportItemResponse;
import com.salonpos.dto.FaceVerificationResponse;
import com.salonpos.dto.PagedResponse;
import com.salonpos.service.AttendanceService;
import jakarta.validation.Valid;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/attendance")
public class AttendanceController {

    private final AttendanceService attendanceService;

    public AttendanceController(AttendanceService attendanceService) {
        this.attendanceService = attendanceService;
    }

    @GetMapping("/report")
    public PagedResponse<AttendanceReportItemResponse> report(
        @RequestParam(required = false) Long staffId,
        @RequestParam(required = false) Long branchId,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        return attendanceService.report(staffId, branchId, from, to, page, size);
    }

    @PostMapping(value = "/verify-face", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public FaceVerificationResponse verifyFace(
        @RequestParam Long staffId,
        @RequestPart("selfie") MultipartFile selfie
    ) {
        return attendanceService.verifyFace(staffId, selfie);
    }

    @PostMapping("/clock-in")
    public AttendanceLogResponse clockIn(@Valid @RequestBody AttendanceClockInRequest request) {
        return attendanceService.clockIn(request);
    }

    @PostMapping("/break-start")
    public AttendanceLogResponse breakStart(@Valid @RequestBody AttendanceActionRequest request) {
        return attendanceService.breakStart(request);
    }

    @PostMapping("/break-end")
    public AttendanceLogResponse breakEnd(@Valid @RequestBody AttendanceActionRequest request) {
        return attendanceService.breakEnd(request);
    }

    @PostMapping("/clock-out")
    public AttendanceLogResponse clockOut(@Valid @RequestBody AttendanceClockOutRequest request) {
        return attendanceService.clockOut(request);
    }
}
