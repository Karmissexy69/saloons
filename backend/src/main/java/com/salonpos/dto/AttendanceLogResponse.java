package com.salonpos.dto;

import com.salonpos.domain.AttendanceStatus;
import java.time.OffsetDateTime;

public record AttendanceLogResponse(
    Long id,
    Long staffId,
    Long branchId,
    OffsetDateTime clockInAt,
    OffsetDateTime clockOutAt,
    Integer breakMinutes,
    AttendanceStatus attendanceStatus
) {
}
