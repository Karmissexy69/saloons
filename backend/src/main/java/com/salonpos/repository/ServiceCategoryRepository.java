package com.salonpos.repository;

import com.salonpos.domain.ServiceCategory;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ServiceCategoryRepository extends JpaRepository<ServiceCategory, Long> {

    Optional<ServiceCategory> findByNameIgnoreCase(String name);

    Optional<ServiceCategory> findTopByOrderBySortOrderDesc();
}
