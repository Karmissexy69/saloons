package com.salonpos.repository;

import com.salonpos.domain.CustomerSession;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerSessionRepository extends JpaRepository<CustomerSession, Long> {

    Optional<CustomerSession> findByIdAndRevokedAtIsNull(Long id);

    List<CustomerSession> findByCustomerIdAndRevokedAtIsNull(Long customerId);
}
