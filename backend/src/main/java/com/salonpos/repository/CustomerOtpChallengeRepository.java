package com.salonpos.repository;

import com.salonpos.domain.CustomerOtpChallenge;
import com.salonpos.domain.CustomerOtpPurpose;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.query.Param;

public interface CustomerOtpChallengeRepository extends JpaRepository<CustomerOtpChallenge, Long> {

    @Query("""
        SELECT c
        FROM CustomerOtpChallenge c
        WHERE c.emailNormalized = :emailNormalized
          AND c.purpose = :purpose
          AND (
            (:referenceValue IS NULL AND c.referenceValue IS NULL)
            OR c.referenceValue = :referenceValue
          )
        ORDER BY c.createdAt DESC, c.id DESC
        """)
    List<CustomerOtpChallenge> findLatest(
        @Param("emailNormalized") String emailNormalized,
        @Param("purpose") CustomerOtpPurpose purpose,
        @Param("referenceValue") String referenceValue,
        Pageable pageable
    );
}
