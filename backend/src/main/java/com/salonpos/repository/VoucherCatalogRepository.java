package com.salonpos.repository;

import com.salonpos.domain.VoucherCatalog;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VoucherCatalogRepository extends JpaRepository<VoucherCatalog, Long> {

    Optional<VoucherCatalog> findByCodeIgnoreCase(String code);

    @Query("""
        SELECT vc
        FROM VoucherCatalog vc
        LEFT JOIN FETCH vc.service
        WHERE vc.active = true
          AND (vc.validFrom IS NULL OR vc.validFrom <= :asOf)
          AND (vc.validTo IS NULL OR vc.validTo >= :asOf)
        ORDER BY vc.pointsCost ASC, vc.name ASC
    """)
    List<VoucherCatalog> findActiveCatalogVisibleAt(@Param("asOf") OffsetDateTime asOf);

    List<VoucherCatalog> findAllByOrderByActiveDescNameAsc();
}
