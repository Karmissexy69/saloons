package com.salonpos.repository;

import com.salonpos.domain.Appointment;
import com.salonpos.domain.AppointmentStatus;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

    List<Appointment> findByStartAtBetweenOrderByStartAtAsc(OffsetDateTime from, OffsetDateTime to);

    List<Appointment> findByBranchIdAndStartAtBetweenOrderByStartAtAsc(Long branchId, OffsetDateTime from, OffsetDateTime to);

    List<Appointment> findByStatusOrderByStartAtAsc(AppointmentStatus status);
}
