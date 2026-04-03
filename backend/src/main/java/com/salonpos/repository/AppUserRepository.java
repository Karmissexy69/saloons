package com.salonpos.repository;

import com.salonpos.domain.AppUser;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {

    Optional<AppUser> findByUsername(String username);

    @Query("""
        SELECT u
        FROM AppUser u
        JOIN FETCH u.role r
        WHERE u.username = :username
        """)
    Optional<AppUser> findByUsernameWithRole(@Param("username") String username);
}
