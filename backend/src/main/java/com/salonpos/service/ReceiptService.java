package com.salonpos.service;

import com.salonpos.domain.Receipt;
import com.salonpos.domain.TransactionStatus;
import com.salonpos.dto.PagedResponse;
import com.salonpos.dto.ReceiptHistoryItemResponse;
import com.salonpos.dto.ReceiptResponse;
import com.salonpos.exception.NotFoundException;
import com.salonpos.repository.ReceiptRepository;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

@Service
public class ReceiptService {

    private static final OffsetDateTime EARLIEST_TIMESTAMP = OffsetDateTime.of(1970, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC);
    private static final OffsetDateTime LATEST_TIMESTAMP = OffsetDateTime.of(9999, 12, 31, 23, 59, 59, 999_999_999, ZoneOffset.UTC);

    private final ReceiptRepository receiptRepository;
    private final AuditLogService auditLogService;

    public ReceiptService(ReceiptRepository receiptRepository, AuditLogService auditLogService) {
        this.receiptRepository = receiptRepository;
        this.auditLogService = auditLogService;
    }

    public ReceiptResponse getByReceiptNo(String receiptNo) {
        Receipt receipt = receiptRepository.findByReceiptNo(receiptNo)
            .orElseThrow(() -> new NotFoundException("Receipt not found: " + receiptNo));

        return new ReceiptResponse(
            receipt.getReceiptNo(),
            receipt.getReceiptJson(),
            receipt.getSentStatus(),
            receipt.getGeneratedAt());
    }

    public PagedResponse<ReceiptHistoryItemResponse> history(
        String receiptNo,
        Long branchId,
        Long cashierId,
        TransactionStatus status,
        LocalDate from,
        LocalDate to,
        int page,
        int size
    ) {
        String receiptNoFilter = receiptNo == null ? "" : receiptNo.trim();
        OffsetDateTime fromAt = from == null ? EARLIEST_TIMESTAMP : from.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime toAt = to == null ? LATEST_TIMESTAMP : to.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC).minusNanos(1);

        Page<Receipt> result = receiptRepository.search(
            receiptNoFilter,
            branchId,
            cashierId,
            status,
            fromAt,
            toAt,
            PageRequest.of(page, size)
        );

        List<ReceiptHistoryItemResponse> items = result.getContent().stream().map(this::toHistoryItem).toList();

        return new PagedResponse<>(items, page, size, result.getTotalElements(), result.getTotalPages());
    }

    public String exportHistoryCsv(
        String receiptNo,
        Long branchId,
        Long cashierId,
        TransactionStatus status,
        LocalDate from,
        LocalDate to
    ) {
        String receiptNoFilter = receiptNo == null ? "" : receiptNo.trim();
        OffsetDateTime fromAt = from == null ? EARLIEST_TIMESTAMP : from.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime toAt = to == null ? LATEST_TIMESTAMP : to.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC).minusNanos(1);

        List<Receipt> records = receiptRepository.searchAll(receiptNoFilter, branchId, cashierId, status, fromAt, toAt);

        StringBuilder csv = new StringBuilder();
        csv.append("receiptNo,generatedAt,branchId,cashierId,total,sentStatus,transactionStatus\n");

        for (Receipt receipt : records) {
            csv.append(receipt.getReceiptNo()).append(',')
                .append(receipt.getGeneratedAt()).append(',')
                .append(receipt.getTransaction().getBranchId()).append(',')
                .append(receipt.getTransaction().getCashierId()).append(',')
                .append(receipt.getTransaction().getTotal()).append(',')
                .append(receipt.getSentStatus()).append(',')
                .append(receipt.getTransaction().getStatus())
                .append('\n');
        }

        auditLogService.log("RECEIPT_HISTORY_EXPORTED", "receipt", null, null, java.util.Map.of("count", records.size()));
        return csv.toString();
    }

    private ReceiptHistoryItemResponse toHistoryItem(Receipt receipt) {
        return new ReceiptHistoryItemResponse(
            receipt.getReceiptNo(),
            receipt.getGeneratedAt(),
            receipt.getTransaction().getBranchId(),
            receipt.getTransaction().getCashierId(),
            receipt.getTransaction().getTotal(),
            receipt.getSentStatus(),
            receipt.getTransaction().getStatus()
        );
    }
}
