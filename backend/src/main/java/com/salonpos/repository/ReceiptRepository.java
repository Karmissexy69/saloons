package com.salonpos.repository;

import com.salonpos.domain.Receipt;
import com.salonpos.domain.TransactionStatus;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReceiptRepository extends JpaRepository<Receipt, Long> {

    Optional<Receipt> findByReceiptNo(String receiptNo);

    @Query("""
        SELECT r FROM Receipt r
        JOIN FETCH r.transaction t
        WHERE (:receiptNo = '' OR LOWER(r.receiptNo) LIKE LOWER(CONCAT('%', :receiptNo, '%')))
          AND (:branchId IS NULL OR t.branchId = :branchId)
          AND (:cashierId IS NULL OR t.cashierId = :cashierId)
          AND (:status IS NULL OR t.status = :status)
          AND r.generatedAt >= :fromAt
          AND r.generatedAt <= :toAt
        ORDER BY r.generatedAt DESC
        """)
    Page<Receipt> search(
        @Param("receiptNo") String receiptNo,
        @Param("branchId") Long branchId,
        @Param("cashierId") Long cashierId,
        @Param("status") TransactionStatus status,
        @Param("fromAt") OffsetDateTime fromAt,
        @Param("toAt") OffsetDateTime toAt,
        Pageable pageable
    );

    @Query("""
        SELECT r FROM Receipt r
        JOIN FETCH r.transaction t
        WHERE (:receiptNo = '' OR LOWER(r.receiptNo) LIKE LOWER(CONCAT('%', :receiptNo, '%')))
          AND (:branchId IS NULL OR t.branchId = :branchId)
          AND (:cashierId IS NULL OR t.cashierId = :cashierId)
          AND (:status IS NULL OR t.status = :status)
          AND r.generatedAt >= :fromAt
          AND r.generatedAt <= :toAt
        ORDER BY r.generatedAt DESC
        """)
    List<Receipt> searchAll(
        @Param("receiptNo") String receiptNo,
        @Param("branchId") Long branchId,
        @Param("cashierId") Long cashierId,
        @Param("status") TransactionStatus status,
        @Param("fromAt") OffsetDateTime fromAt,
        @Param("toAt") OffsetDateTime toAt
    );
}
