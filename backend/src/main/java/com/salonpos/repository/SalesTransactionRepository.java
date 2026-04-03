package com.salonpos.repository;

import com.salonpos.domain.SalesTransaction;
import com.salonpos.domain.TransactionStatus;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SalesTransactionRepository extends JpaRepository<SalesTransaction, Long> {

    Optional<SalesTransaction> findByReceiptNo(String receiptNo);

    List<SalesTransaction> findByStatusAndSoldAtBetween(TransactionStatus status, OffsetDateTime from, OffsetDateTime to);

    List<SalesTransaction> findByBranchIdAndStatusAndSoldAtBetween(
        Long branchId,
        TransactionStatus status,
        OffsetDateTime from,
        OffsetDateTime to
    );
}
