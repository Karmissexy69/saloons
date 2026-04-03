package com.salonpos.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "attendance_logs")
public class AttendanceLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "staff_id", nullable = false)
    private StaffProfile staff;

    @Column(name = "branch_id", nullable = false)
    private Long branchId;

    @Column(name = "clock_in_at", nullable = false)
    private OffsetDateTime clockInAt;

    @Column(name = "clock_out_at")
    private OffsetDateTime clockOutAt;

    @Column(name = "current_break_start_at")
    private OffsetDateTime currentBreakStartAt;

    @Column(name = "break_minutes", nullable = false)
    private Integer breakMinutes = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "attendance_status", nullable = false)
    private AttendanceStatus attendanceStatus;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;
}
