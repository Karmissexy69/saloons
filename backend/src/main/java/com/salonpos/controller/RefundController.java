package com.salonpos.controller;

import com.salonpos.dto.CreateRefundRequest;
import com.salonpos.dto.CreateRefundResponse;
import com.salonpos.service.RefundService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/refunds")
public class RefundController {

    private final RefundService refundService;

    public RefundController(RefundService refundService) {
        this.refundService = refundService;
    }

    @PostMapping
    public CreateRefundResponse create(@Valid @RequestBody CreateRefundRequest request) {
        return refundService.create(request);
    }
}
