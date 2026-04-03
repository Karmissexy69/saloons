package com.salonpos.dto;

import com.salonpos.domain.AttendanceStatus;
import java.time.OffsetDateTime;

public record AttendanceReportItemResponse(
    Long id,
    Long staffId,
    String staffName,
    Long branchId,
    OffsetDateTime clockInAt,
    OffsetDateTime clockOutAt,
    Integer breakMinutes,
    Integer workedMinutes,
    AttendanceStatus attendanceStatus
) {
}
