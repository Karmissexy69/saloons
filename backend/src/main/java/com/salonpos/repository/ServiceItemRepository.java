package com.salonpos.repository;

import com.salonpos.domain.ServiceItem;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ServiceItemRepository extends JpaRepository<ServiceItem, Long> {

    @Query("""
        SELECT s
        FROM ServiceItem s
        JOIN FETCH s.category c
        WHERE s.active = true
        ORDER BY c.sortOrder ASC, s.name ASC
    """)
    List<ServiceItem> findByActiveTrueOrderByCategorySortOrderAscNameAsc();

    boolean existsByCategory_IdAndNameIgnoreCase(Long categoryId, String name);
}
