package com.salonpos.service;

import com.salonpos.domain.CommissionEntry;
import com.salonpos.domain.CommissionRuleType;
import com.salonpos.domain.CommissionStatus;
import com.salonpos.domain.SalesTransaction;
import com.salonpos.domain.StaffProfile;
import com.salonpos.domain.TransactionLine;
import com.salonpos.dto.CommissionStatementResponse;
import com.salonpos.exception.NotFoundException;
import com.salonpos.repository.CommissionEntryRepository;
import com.salonpos.repository.StaffProfileRepository;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class CommissionService {

    private final CommissionEntryRepository commissionEntryRepository;
    private final StaffProfileRepository staffProfileRepository;

    public CommissionService(
        CommissionEntryRepository commissionEntryRepository,
        StaffProfileRepository staffProfileRepository
    ) {
        this.commissionEntryRepository = commissionEntryRepository;
        this.staffProfileRepository = staffProfileRepository;
    }

    @Transactional
    public void generateForPaidTransaction(SalesTransaction transaction) {
        List<CommissionEntry> entries = new ArrayList<>();

        for (TransactionLine line : transaction.getLines()) {
            if (line.getAssignedStaffId() == null) {
                continue;
            }

            StaffProfile staff = staffProfileRepository.findById(line.getAssignedStaffId())
                .orElseThrow(() -> new NotFoundException("Assigned staff not found: " + line.getAssignedStaffId()));

            BigDecimal lineNet = line.getUnitPrice()
                .multiply(BigDecimal.valueOf(line.getQty()))
                .subtract(line.getDiscountAmount());

            BigDecimal amount;
            if (line.getService().getCommissionType() == CommissionRuleType.FIXED) {
                amount = line.getService().getCommissionValue().multiply(BigDecimal.valueOf(line.getQty()));
            } else {
                amount = lineNet.multiply(line.getService().getCommissionValue())
                    .divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
            }

            CommissionEntry entry = new CommissionEntry();
            entry.setTransactionLine(line);
            entry.setStaff(staff);
            entry.setCommissionAmount(scale(amount));
            entry.setStatus(CommissionStatus.EARNED);
            entry.setCalculatedAt(OffsetDateTime.now());
            entries.add(entry);
        }

        if (!entries.isEmpty()) {
            commissionEntryRepository.saveAll(entries);
        }
    }

    @Transactional
    public void reverseForRefund(Long transactionId, BigDecimal refundRatio) {
        List<CommissionEntry> earnedEntries = commissionEntryRepository.findByTransactionLine_Transaction_Id(transactionId)
            .stream()
            .filter(entry -> entry.getStatus() == CommissionStatus.EARNED)
            .toList();

        List<CommissionEntry> reversals = new ArrayList<>();
        for (CommissionEntry earned : earnedEntries) {
            CommissionEntry reversal = new CommissionEntry();
            reversal.setTransactionLine(earned.getTransactionLine());
            reversal.setStaff(earned.getStaff());
            reversal.setCommissionAmount(scale(earned.getCommissionAmount().multiply(refundRatio).negate()));
            reversal.setStatus(CommissionStatus.REVERSAL);
            reversal.setCalculatedAt(OffsetDateTime.now());
            reversals.add(reversal);
        }

        if (!reversals.isEmpty()) {
            commissionEntryRepository.saveAll(reversals);
        }
    }

    public CommissionStatementResponse getStatement(Long staffId, LocalDate from, LocalDate to) {
        staffProfileRepository.findById(staffId)
            .orElseThrow(() -> new NotFoundException("Staff not found: " + staffId));

        OffsetDateTime start = from.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime end = to.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC).minusNanos(1);

        List<CommissionEntry> entries = commissionEntryRepository.findByStaffIdAndCalculatedAtBetween(staffId, start, end);

        BigDecimal earned = entries.stream()
            .filter(entry -> entry.getStatus() == CommissionStatus.EARNED)
            .map(CommissionEntry::getCommissionAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal reversal = entries.stream()
            .filter(entry -> entry.getStatus() == CommissionStatus.REVERSAL)
            .map(CommissionEntry::getCommissionAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new CommissionStatementResponse(staffId, scale(earned), scale(reversal), scale(earned.add(reversal)));
    }

    private BigDecimal scale(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }
}
