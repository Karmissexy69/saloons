package com.salonpos.repository;

import com.salonpos.domain.AttendanceLog;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AttendanceLogRepository extends JpaRepository<AttendanceLog, Long> {

    Optional<AttendanceLog> findFirstByStaffIdAndClockOutAtIsNullOrderByClockInAtDesc(Long staffId);

    List<AttendanceLog> findByStaffIdAndClockInAtBetween(Long staffId, OffsetDateTime from, OffsetDateTime to);

    @Query(
        value = """
            SELECT l
            FROM AttendanceLog l
            JOIN FETCH l.staff s
            WHERE (:staffId IS NULL OR s.id = :staffId)
              AND (:branchId IS NULL OR l.branchId = :branchId)
              AND l.clockInAt >= :fromAt
              AND l.clockInAt <= :toAt
            ORDER BY l.clockInAt DESC
            """,
        countQuery = """
            SELECT COUNT(l)
            FROM AttendanceLog l
            JOIN l.staff s
            WHERE (:staffId IS NULL OR s.id = :staffId)
              AND (:branchId IS NULL OR l.branchId = :branchId)
              AND l.clockInAt >= :fromAt
              AND l.clockInAt <= :toAt
            """
    )
    Page<AttendanceLog> search(
        @Param("staffId") Long staffId,
        @Param("branchId") Long branchId,
        @Param("fromAt") OffsetDateTime fromAt,
        @Param("toAt") OffsetDateTime toAt,
        Pageable pageable
    );
}
