package com.salonpos.repository;

import com.salonpos.domain.LoyaltyPointsEntryType;
import com.salonpos.domain.LoyaltyPointsTransaction;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LoyaltyPointsTransactionRepository extends JpaRepository<LoyaltyPointsTransaction, Long> {

    List<LoyaltyPointsTransaction> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    Optional<LoyaltyPointsTransaction> findTopByTransactionIdAndEntryType(Long transactionId, LoyaltyPointsEntryType entryType);
}
