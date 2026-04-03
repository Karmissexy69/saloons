package com.salonpos.repository;

import com.salonpos.domain.CommissionEntry;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommissionEntryRepository extends JpaRepository<CommissionEntry, Long> {

    List<CommissionEntry> findByTransactionLine_Transaction_Id(Long transactionId);

    List<CommissionEntry> findByStaffIdAndCalculatedAtBetween(Long staffId, OffsetDateTime from, OffsetDateTime to);
}
