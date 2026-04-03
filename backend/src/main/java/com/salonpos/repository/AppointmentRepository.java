package com.salonpos.repository;

import com.salonpos.domain.Appointment;
import com.salonpos.domain.AppointmentStatus;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

    @Query("""
        SELECT a FROM Appointment a
        WHERE (:fromAt IS NULL OR a.startAt >= :fromAt)
          AND (:toAt IS NULL OR a.startAt <= :toAt)
          AND (:branchId IS NULL OR a.branchId = :branchId)
          AND (:status IS NULL OR a.status = :status)
        ORDER BY a.startAt ASC
        """)
    List<Appointment> search(
        @Param("fromAt") OffsetDateTime fromAt,
        @Param("toAt") OffsetDateTime toAt,
        @Param("branchId") Long branchId,
        @Param("status") AppointmentStatus status
    );
}
