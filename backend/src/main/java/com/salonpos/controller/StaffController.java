package com.salonpos.controller;

import com.salonpos.dto.CreateStaffRequest;
import com.salonpos.dto.StaffCreateResponse;
import com.salonpos.dto.StaffFaceReEnrollResponse;
import com.salonpos.dto.StaffProfileResponse;
import com.salonpos.service.StaffService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/staff")
public class StaffController {

    private final StaffService staffService;

    public StaffController(StaffService staffService) {
        this.staffService = staffService;
    }

    @GetMapping
    public List<StaffProfileResponse> list() {
        return staffService.list();
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public StaffCreateResponse create(
        @Valid @RequestPart("profile") CreateStaffRequest profile,
        @RequestPart("enrollmentPhoto") MultipartFile enrollmentPhoto
    ) {
        return staffService.create(profile, enrollmentPhoto);
    }

    @PostMapping(value = "/{staffId}/face/re-enroll", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public StaffFaceReEnrollResponse reEnrollFace(
        @PathVariable Long staffId,
        @RequestPart("enrollmentPhoto") MultipartFile enrollmentPhoto
    ) {
        return staffService.reEnrollFace(staffId, enrollmentPhoto);
    }
}
