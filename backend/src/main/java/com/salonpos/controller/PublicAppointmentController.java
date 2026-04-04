package com.salonpos.controller;

import com.salonpos.dto.AppointmentResponse;
import com.salonpos.dto.CancelAppointmentRequest;
import com.salonpos.dto.PublicCreateAppointmentRequest;
import com.salonpos.service.AppointmentService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/appointments")
public class PublicAppointmentController {

    private final AppointmentService appointmentService;

    public PublicAppointmentController(AppointmentService appointmentService) {
        this.appointmentService = appointmentService;
    }

    @PostMapping
    public AppointmentResponse create(@Valid @RequestBody PublicCreateAppointmentRequest request) {
        return appointmentService.createPublic(request);
    }

    @PostMapping({"/{bookingReference}/cancel", "/{bookingReference}/cancel/confirm"})
    public AppointmentResponse cancel(
        @PathVariable String bookingReference,
        @Valid @RequestBody CancelAppointmentRequest request
    ) {
        return appointmentService.cancelGuest(bookingReference, request.reason());
    }
}
