package com.salonpos.service;

import com.salonpos.domain.SalesTransaction;
import com.salonpos.domain.TransactionStatus;
import com.salonpos.dto.SalesSummaryResponse;
import com.salonpos.repository.RefundRepository;
import com.salonpos.repository.SalesTransactionRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ReportService {

    private final SalesTransactionRepository salesTransactionRepository;
    private final RefundRepository refundRepository;
    private final BranchService branchService;

    public ReportService(
        SalesTransactionRepository salesTransactionRepository,
        RefundRepository refundRepository,
        BranchService branchService
    ) {
        this.salesTransactionRepository = salesTransactionRepository;
        this.refundRepository = refundRepository;
        this.branchService = branchService;
    }

    public SalesSummaryResponse salesSummary(LocalDate from, LocalDate to, Long branchId) {
        if (branchId != null) {
            branchService.requireBranch(branchId);
        }

        OffsetDateTime start = from.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime end = to.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC).minusNanos(1);

        List<SalesTransaction> paidTransactions = branchId == null
            ? salesTransactionRepository.findByStatusAndSoldAtBetween(TransactionStatus.PAID, start, end)
            : salesTransactionRepository.findByBranchIdAndStatusAndSoldAtBetween(branchId, TransactionStatus.PAID, start, end);

        List<SalesTransaction> refundedTransactions = branchId == null
            ? salesTransactionRepository.findByStatusAndSoldAtBetween(TransactionStatus.REFUNDED, start, end)
            : salesTransactionRepository.findByBranchIdAndStatusAndSoldAtBetween(branchId, TransactionStatus.REFUNDED, start, end);

        List<SalesTransaction> completedTransactions = new java.util.ArrayList<>();
        completedTransactions.addAll(paidTransactions);
        completedTransactions.addAll(refundedTransactions);

        BigDecimal grossSales = completedTransactions.stream()
            .map(SalesTransaction::getSubtotal)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal discountTotal = completedTransactions.stream()
            .map(SalesTransaction::getDiscountTotal)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal netSalesBeforeRefund = completedTransactions.stream()
            .map(SalesTransaction::getTotal)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal refundTotal = (branchId == null
            ? refundRepository.findByRefundedAtBetween(start, end)
            : refundRepository.findByTransactionBranchIdAndRefundedAtBetween(branchId, start, end))
            .stream()
            .map(refund -> refund.getTotalRefund())
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        long count = completedTransactions.size();
        BigDecimal avg = count == 0
            ? BigDecimal.ZERO
            : netSalesBeforeRefund.divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP);

        return new SalesSummaryResponse(
            scale(grossSales),
            scale(netSalesBeforeRefund.subtract(refundTotal)),
            scale(discountTotal),
            scale(refundTotal),
            scale(avg),
            count
        );
    }

    private BigDecimal scale(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }
}
