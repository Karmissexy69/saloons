package com.salonpos.repository;

import com.salonpos.domain.Customer;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CustomerRepository extends JpaRepository<Customer, Long> {

    Optional<Customer> findByPhoneNormalized(String phoneNormalized);

    List<Customer> findAllByEmailIgnoreCase(String email);

    boolean existsByPhoneNormalized(String phoneNormalized);

    boolean existsByPhoneNormalizedAndIdNot(String phoneNormalized, Long id);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCaseAndIdNot(String email, Long id);

    @Query("""
        SELECT c
        FROM Customer c
        LEFT JOIN FETCH c.favoriteStaff
        LEFT JOIN FETCH c.secondaryFavoriteStaff
        WHERE (
            :query = ''
            OR LOWER(c.name) LIKE LOWER(CONCAT('%', :query, '%'))
            OR LOWER(COALESCE(c.email, '')) LIKE LOWER(CONCAT('%', :query, '%'))
            OR LOWER(COALESCE(c.phone, '')) LIKE LOWER(CONCAT('%', :query, '%'))
            OR LOWER(COALESCE(c.phoneNormalized, '')) LIKE LOWER(CONCAT('%', :query, '%'))
        )
        ORDER BY c.updatedAt DESC, c.id DESC
        """)
    List<Customer> search(@Param("query") String query);

    @Query("""
        SELECT c
        FROM Customer c
        LEFT JOIN FETCH c.favoriteStaff
        LEFT JOIN FETCH c.secondaryFavoriteStaff
        WHERE c.id = :id
        """)
    Optional<Customer> findDetailedById(@Param("id") Long id);
}
