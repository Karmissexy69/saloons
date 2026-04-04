package com.salonpos.repository;

import com.salonpos.domain.CustomerVoucher;
import com.salonpos.domain.CustomerVoucherStatus;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CustomerVoucherRepository extends JpaRepository<CustomerVoucher, Long> {

    @Query("""
        SELECT cv
        FROM CustomerVoucher cv
        JOIN FETCH cv.voucherCatalog vc
        WHERE cv.customer.id = :customerId
        ORDER BY cv.redeemedAt DESC
        """)
    List<CustomerVoucher> findByCustomerIdWithCatalog(@Param("customerId") Long customerId);

    @Query("""
        SELECT cv
        FROM CustomerVoucher cv
        JOIN FETCH cv.voucherCatalog vc
        WHERE cv.customer.id = :customerId
          AND cv.status = :status
        ORDER BY cv.redeemedAt DESC
        """)
    List<CustomerVoucher> findByCustomerIdAndStatusWithCatalog(
        @Param("customerId") Long customerId,
        @Param("status") CustomerVoucherStatus status
    );

    @Query("""
        SELECT cv
        FROM CustomerVoucher cv
        JOIN FETCH cv.voucherCatalog vc
        LEFT JOIN FETCH vc.service
        WHERE cv.id = :id
        """)
    Optional<CustomerVoucher> findDetailedById(@Param("id") Long id);

    @Query("""
        SELECT COUNT(cv)
        FROM CustomerVoucher cv
        WHERE cv.voucherCatalog.id = :catalogId
          AND cv.redeemedAt >= :dayStart
          AND cv.redeemedAt < :dayEnd
        """)
    long countRedemptionsForCatalogBetween(
        @Param("catalogId") Long catalogId,
        @Param("dayStart") OffsetDateTime dayStart,
        @Param("dayEnd") OffsetDateTime dayEnd
    );
}
