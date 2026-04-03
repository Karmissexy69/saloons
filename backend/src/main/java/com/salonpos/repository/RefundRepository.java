package com.salonpos.repository;

import com.salonpos.domain.Refund;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RefundRepository extends JpaRepository<Refund, Long> {

    List<Refund> findByRefundedAtBetween(OffsetDateTime from, OffsetDateTime to);

    List<Refund> findByTransactionBranchIdAndRefundedAtBetween(Long branchId, OffsetDateTime from, OffsetDateTime to);
}
