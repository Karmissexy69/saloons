package com.salonpos.repository;

import com.salonpos.domain.Appointment;
import com.salonpos.domain.AppointmentStatus;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

    @Query("""
        SELECT DISTINCT a FROM Appointment a
        LEFT JOIN FETCH a.customer c
        LEFT JOIN FETCH a.staff s
        LEFT JOIN FETCH a.service svc
        WHERE a.startAt >= :fromAt
          AND a.startAt <= :toAt
          AND (:filterByBranch = false OR a.branchId = :branchId)
          AND (:filterByStatus = false OR a.status = :status)
          AND (
            :query = ''
            OR LOWER(COALESCE(c.name, '')) LIKE LOWER(CONCAT('%', :query, '%'))
            OR LOWER(COALESCE(c.phone, '')) LIKE LOWER(CONCAT('%', :query, '%'))
            OR LOWER(COALESCE(a.guestName, '')) LIKE LOWER(CONCAT('%', :query, '%'))
            OR LOWER(COALESCE(a.guestPhone, '')) LIKE LOWER(CONCAT('%', :query, '%'))
            OR LOWER(COALESCE(a.guestEmail, '')) LIKE LOWER(CONCAT('%', :query, '%'))
            OR LOWER(COALESCE(a.bookingReference, '')) LIKE LOWER(CONCAT('%', :query, '%'))
            OR LOWER(COALESCE(a.receiptNo, '')) LIKE LOWER(CONCAT('%', :query, '%'))
            OR LOWER(COALESCE(svc.name, '')) LIKE LOWER(CONCAT('%', :query, '%'))
            OR LOWER(COALESCE(s.displayName, '')) LIKE LOWER(CONCAT('%', :query, '%'))
          )
        ORDER BY a.startAt ASC
        """)
    List<Appointment> search(
        @Param("fromAt") OffsetDateTime fromAt,
        @Param("toAt") OffsetDateTime toAt,
        @Param("filterByBranch") boolean filterByBranch,
        @Param("branchId") Long branchId,
        @Param("filterByStatus") boolean filterByStatus,
        @Param("status") AppointmentStatus status,
        @Param("query") String query
    );

    @Query("""
        SELECT a
        FROM Appointment a
        LEFT JOIN FETCH a.customer
        LEFT JOIN FETCH a.staff
        LEFT JOIN FETCH a.service
        WHERE a.id = :id
        """)
    Optional<Appointment> findDetailedById(@Param("id") Long id);

    @Query("""
        SELECT a
        FROM Appointment a
        LEFT JOIN FETCH a.customer
        LEFT JOIN FETCH a.staff
        LEFT JOIN FETCH a.service
        WHERE a.bookingReference = :bookingReference
        """)
    Optional<Appointment> findByBookingReferenceDetailed(@Param("bookingReference") String bookingReference);

    @Query("""
        SELECT a
        FROM Appointment a
        LEFT JOIN FETCH a.customer
        LEFT JOIN FETCH a.staff
        LEFT JOIN FETCH a.service
        WHERE a.customer.id = :customerId
        ORDER BY a.startAt DESC
        """)
    List<Appointment> findByCustomerIdDetailed(@Param("customerId") Long customerId);

    @Query("""
        SELECT COUNT(a)
        FROM Appointment a
        WHERE a.staff.id = :staffId
          AND (:excludeId IS NULL OR a.id <> :excludeId)
          AND a.status NOT IN (com.salonpos.domain.AppointmentStatus.CANCELLED, com.salonpos.domain.AppointmentStatus.NO_SHOW)
          AND a.startAt < :endAt
          AND COALESCE(a.endAt, a.startAt) > :startAt
        """)
    long countOverlappingForStaff(
        @Param("staffId") Long staffId,
        @Param("startAt") OffsetDateTime startAt,
        @Param("endAt") OffsetDateTime endAt,
        @Param("excludeId") Long excludeId
    );

    @Query("""
        SELECT a
        FROM Appointment a
        LEFT JOIN FETCH a.customer
        LEFT JOIN FETCH a.staff
        LEFT JOIN FETCH a.service
        WHERE a.customer IS NULL
          AND a.guestPhoneNormalized = :phoneNormalized
        ORDER BY a.createdAt DESC
        """)
    List<Appointment> findGuestAppointmentsByPhoneNormalized(@Param("phoneNormalized") String phoneNormalized);

    @Query("""
        SELECT a
        FROM Appointment a
        LEFT JOIN FETCH a.customer
        LEFT JOIN FETCH a.staff
        LEFT JOIN FETCH a.service
        WHERE a.customer IS NULL
          AND LOWER(COALESCE(a.guestEmail, '')) = LOWER(:email)
        ORDER BY a.createdAt DESC
        """)
    List<Appointment> findGuestAppointmentsByGuestEmail(@Param("email") String email);

    @Query("""
        SELECT a
        FROM Appointment a
        LEFT JOIN FETCH a.customer c
        LEFT JOIN FETCH a.staff
        LEFT JOIN FETCH a.service
        WHERE a.status = com.salonpos.domain.AppointmentStatus.BOOKED
          AND a.reminderEmailSentAt IS NULL
          AND a.startAt >= :fromAt
          AND a.startAt <= :toAt
          AND (COALESCE(a.guestEmail, '') <> '' OR COALESCE(c.email, '') <> '')
        ORDER BY a.startAt ASC
        """)
    List<Appointment> findReminderCandidates(@Param("fromAt") OffsetDateTime fromAt, @Param("toAt") OffsetDateTime toAt);
}
