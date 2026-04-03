package com.salonpos.controller;

import com.salonpos.domain.TransactionStatus;
import com.salonpos.dto.PagedResponse;
import com.salonpos.dto.ReceiptHistoryItemResponse;
import com.salonpos.dto.ReceiptResponse;
import com.salonpos.service.ReceiptService;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/receipts")
public class ReceiptController {

    private final ReceiptService receiptService;

    public ReceiptController(ReceiptService receiptService) {
        this.receiptService = receiptService;
    }

    @GetMapping("/{receiptNo}")
    public ReceiptResponse get(@PathVariable String receiptNo) {
        return receiptService.getByReceiptNo(receiptNo);
    }

    @GetMapping("/history")
    public PagedResponse<ReceiptHistoryItemResponse> history(
        @RequestParam(required = false) String receiptNo,
        @RequestParam(required = false) Long branchId,
        @RequestParam(required = false) Long cashierId,
        @RequestParam(required = false) TransactionStatus status,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        return receiptService.history(receiptNo, branchId, cashierId, status, from, to, page, size);
    }

    @GetMapping(value = "/history/export", produces = "text/csv")
    public ResponseEntity<String> exportHistoryCsv(
        @RequestParam(required = false) String receiptNo,
        @RequestParam(required = false) Long branchId,
        @RequestParam(required = false) Long cashierId,
        @RequestParam(required = false) TransactionStatus status,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        String csv = receiptService.exportHistoryCsv(receiptNo, branchId, cashierId, status, from, to);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=receipt-history.csv")
            .contentType(MediaType.valueOf("text/csv"))
            .body(csv);
    }
}
