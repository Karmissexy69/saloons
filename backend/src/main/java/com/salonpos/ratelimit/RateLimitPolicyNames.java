package com.salonpos.ratelimit;

public final class RateLimitPolicyNames {

    public static final String LOGIN_IP = "login-ip";
    public static final String LOGIN_USERNAME = "login-username";
    public static final String ATTENDANCE_VERIFY_FACE_IP = "attendance-verify-face-ip";
    public static final String ATTENDANCE_VERIFY_FACE_STAFF = "attendance-verify-face-staff";
    public static final String ATTENDANCE_ACTION_STAFF = "attendance-action-staff";
    public static final String STAFF_ENROLL_USER = "staff-enroll-user";
    public static final String STAFF_REENROLL_USER = "staff-reenroll-user";
    public static final String STAFF_REENROLL_TARGET = "staff-reenroll-target";
    public static final String TRANSACTIONS_CREATE = "transactions-create";
    public static final String APPOINTMENT_CONVERT = "appointment-convert";
    public static final String REFUNDS_CREATE = "refunds-create";
    public static final String RECEIPTS_EXPORT = "receipts-export";
    public static final String REPORTS_SALES_SUMMARY = "reports-sales-summary";

    private RateLimitPolicyNames() {
    }
}
