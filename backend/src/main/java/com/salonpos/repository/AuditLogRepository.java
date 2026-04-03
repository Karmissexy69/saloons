package com.salonpos.repository;

import com.salonpos.domain.AuditLog;
import java.time.OffsetDateTime;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    @Query("""
        SELECT a FROM AuditLog a
        LEFT JOIN a.actorUser u
        WHERE (:entityType IS NULL OR LOWER(a.entityType) = LOWER(:entityType))
          AND (:action IS NULL OR LOWER(a.action) LIKE LOWER(CONCAT('%', :action, '%')))
          AND (:fromAt IS NULL OR a.createdAt >= :fromAt)
          AND (:toAt IS NULL OR a.createdAt <= :toAt)
        ORDER BY a.createdAt DESC
        """)
    Page<AuditLog> search(
        @Param("entityType") String entityType,
        @Param("action") String action,
        @Param("fromAt") OffsetDateTime fromAt,
        @Param("toAt") OffsetDateTime toAt,
        Pageable pageable
    );
}
