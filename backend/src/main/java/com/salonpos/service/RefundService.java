package com.salonpos.service;

import com.salonpos.domain.Refund;
import com.salonpos.domain.SalesTransaction;
import com.salonpos.domain.TransactionStatus;
import com.salonpos.dto.CreateRefundRequest;
import com.salonpos.dto.CreateRefundResponse;
import com.salonpos.exception.BadRequestException;
import com.salonpos.exception.NotFoundException;
import com.salonpos.repository.RefundRepository;
import com.salonpos.repository.SalesTransactionRepository;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import org.springframework.stereotype.Service;

@Service
public class RefundService {

    private final SalesTransactionRepository salesTransactionRepository;
    private final RefundRepository refundRepository;
    private final CommissionService commissionService;
    private final AuditLogService auditLogService;

    public RefundService(
        SalesTransactionRepository salesTransactionRepository,
        RefundRepository refundRepository,
        CommissionService commissionService,
        AuditLogService auditLogService
    ) {
        this.salesTransactionRepository = salesTransactionRepository;
        this.refundRepository = refundRepository;
        this.commissionService = commissionService;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public CreateRefundResponse create(CreateRefundRequest request) {
        SalesTransaction transaction = resolveTransaction(request);

        if (transaction.getStatus() != TransactionStatus.PAID) {
            throw new BadRequestException("Only PAID transactions can be refunded.");
        }

        BigDecimal amount = request.totalRefund() == null ? transaction.getTotal() : scale(request.totalRefund());
        if (amount.compareTo(BigDecimal.ZERO) <= 0 || amount.compareTo(transaction.getTotal()) > 0) {
            throw new BadRequestException("Invalid refund amount.");
        }

        Refund refund = new Refund();
        refund.setTransaction(transaction);
        refund.setApprovedBy(request.approvedBy());
        refund.setReason(request.reason().trim());
        refund.setTotalRefund(amount);
        refund.setRefundedAt(OffsetDateTime.now());
        Refund saved = refundRepository.save(refund);

        BigDecimal ratio = amount.divide(transaction.getTotal(), 6, RoundingMode.HALF_UP);
        commissionService.reverseForRefund(transaction.getId(), ratio);

        if (amount.compareTo(transaction.getTotal()) == 0) {
            transaction.setStatus(TransactionStatus.REFUNDED);
            salesTransactionRepository.save(transaction);
        }

        CreateRefundResponse response = new CreateRefundResponse(
            saved.getId(),
            transaction.getId(),
            transaction.getReceiptNo(),
            saved.getTotalRefund(),
            saved.getRefundedAt());
        auditLogService.log("REFUND_CREATED", "refund", saved.getId(), null, response);
        return response;
    }

    private SalesTransaction resolveTransaction(CreateRefundRequest request) {
        if (request.transactionId() != null) {
            return salesTransactionRepository.findById(request.transactionId())
                .orElseThrow(() -> new NotFoundException("Transaction not found: " + request.transactionId()));
        }

        if (request.receiptNo() != null && !request.receiptNo().isBlank()) {
            return salesTransactionRepository.findByReceiptNo(request.receiptNo())
                .orElseThrow(() -> new NotFoundException("Transaction not found for receipt: " + request.receiptNo()));
        }

        throw new BadRequestException("Provide transactionId or receiptNo.");
    }

    private BigDecimal scale(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }
}
