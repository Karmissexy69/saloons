package com.salonpos.controller;

import com.salonpos.domain.AppointmentStatus;
import com.salonpos.dto.AppointmentResponse;
import com.salonpos.dto.ConvertAppointmentToBillRequest;
import com.salonpos.dto.CreateAppointmentRequest;
import com.salonpos.dto.CreateTransactionResponse;
import com.salonpos.dto.UpdateAppointmentStatusRequest;
import com.salonpos.service.AppointmentService;
import jakarta.validation.Valid;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/appointments")
public class AppointmentController {

    private final AppointmentService appointmentService;

    public AppointmentController(AppointmentService appointmentService) {
        this.appointmentService = appointmentService;
    }

    @PostMapping
    public AppointmentResponse create(@Valid @RequestBody CreateAppointmentRequest request) {
        return appointmentService.create(request);
    }

    @GetMapping
    public List<AppointmentResponse> list(
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime to,
        @RequestParam(required = false) Long branchId,
        @RequestParam(required = false) AppointmentStatus status
    ) {
        return appointmentService.list(from, to, branchId, status);
    }

    @PatchMapping("/{id}/status")
    public AppointmentResponse updateStatus(@PathVariable Long id, @Valid @RequestBody UpdateAppointmentStatusRequest request) {
        return appointmentService.updateStatus(id, request);
    }

    @PostMapping("/{id}/convert-to-bill")
    public CreateTransactionResponse convertToBill(
        @PathVariable Long id,
        @Valid @RequestBody ConvertAppointmentToBillRequest request
    ) {
        return appointmentService.convertToBill(id, request);
    }
}
