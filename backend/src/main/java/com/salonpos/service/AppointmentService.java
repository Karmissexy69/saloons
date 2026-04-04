package com.salonpos.service;

import com.salonpos.domain.Appointment;
import com.salonpos.domain.AppointmentBookingChannel;
import com.salonpos.domain.AppointmentCancellationActorType;
import com.salonpos.domain.AppointmentStatus;
import com.salonpos.domain.Customer;
import com.salonpos.domain.SalesTransaction;
import com.salonpos.domain.ServiceItem;
import com.salonpos.domain.StaffProfile;
import com.salonpos.dto.AppointmentResponse;
import com.salonpos.dto.CancelAppointmentRequest;
import com.salonpos.dto.ConvertAppointmentToBillRequest;
import com.salonpos.dto.CreateAppointmentRequest;
import com.salonpos.dto.CreateTransactionRequest;
import com.salonpos.dto.CreateTransactionResponse;
import com.salonpos.dto.CustomerCreateAppointmentRequest;
import com.salonpos.dto.PublicCreateAppointmentRequest;
import com.salonpos.dto.UpdateAppointmentRequest;
import com.salonpos.dto.UpdateAppointmentStatusRequest;
import com.salonpos.exception.BadRequestException;
import com.salonpos.exception.NotFoundException;
import com.salonpos.repository.AppointmentRepository;
import com.salonpos.repository.CustomerRepository;
import com.salonpos.repository.SalesTransactionRepository;
import com.salonpos.repository.ServiceItemRepository;
import com.salonpos.repository.StaffProfileRepository;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class AppointmentService {

    private static final OffsetDateTime SEARCH_MIN_START_AT = OffsetDateTime.of(1970, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC);
    private static final OffsetDateTime SEARCH_MAX_START_AT = OffsetDateTime.of(3000, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC);

    private final AppointmentRepository appointmentRepository;
    private final CustomerRepository customerRepository;
    private final StaffProfileRepository staffProfileRepository;
    private final ServiceItemRepository serviceItemRepository;
    private final SalesTransactionRepository salesTransactionRepository;
    private final TransactionService transactionService;
    private final BranchService branchService;
    private final AuditLogService auditLogService;
    private final PhoneNumberService phoneNumberService;
    private final EmailAddressService emailAddressService;
    private final AppointmentNotificationService appointmentNotificationService;
    private final LoyaltySettingsService loyaltySettingsService;

    public AppointmentService(
        AppointmentRepository appointmentRepository,
        CustomerRepository customerRepository,
        StaffProfileRepository staffProfileRepository,
        ServiceItemRepository serviceItemRepository,
        SalesTransactionRepository salesTransactionRepository,
        TransactionService transactionService,
        BranchService branchService,
        AuditLogService auditLogService,
        PhoneNumberService phoneNumberService,
        EmailAddressService emailAddressService,
        AppointmentNotificationService appointmentNotificationService,
        LoyaltySettingsService loyaltySettingsService
    ) {
        this.appointmentRepository = appointmentRepository;
        this.customerRepository = customerRepository;
        this.staffProfileRepository = staffProfileRepository;
        this.serviceItemRepository = serviceItemRepository;
        this.salesTransactionRepository = salesTransactionRepository;
        this.transactionService = transactionService;
        this.branchService = branchService;
        this.auditLogService = auditLogService;
        this.phoneNumberService = phoneNumberService;
        this.emailAddressService = emailAddressService;
        this.appointmentNotificationService = appointmentNotificationService;
        this.loyaltySettingsService = loyaltySettingsService;
    }

    @Transactional
    public AppointmentResponse create(CreateAppointmentRequest request) {
        Appointment saved = createAppointment(
            request.customerId(),
            request.guestName(),
            request.guestPhone(),
            request.guestEmail(),
            request.staffId(),
            request.branchId(),
            request.serviceId(),
            request.startAt(),
            request.endAt(),
            request.status() == null ? AppointmentStatus.BOOKED : request.status(),
            request.depositAmount(),
            request.customerNote(),
            request.internalNote(),
            AppointmentBookingChannel.POS,
            null
        );
        return toResponse(saved);
    }

    @Transactional
    public AppointmentResponse createPublic(PublicCreateAppointmentRequest request) {
        if (request.startAt().isBefore(OffsetDateTime.now())) {
            throw new BadRequestException("Appointment time must be in the future.");
        }
        Appointment saved = createAppointment(
            null,
            request.guestName(),
            request.guestPhone(),
            request.guestEmail(),
            request.staffId(),
            request.branchId(),
            request.serviceId(),
            request.startAt(),
            request.endAt(),
            AppointmentStatus.BOOKED,
            request.depositAmount(),
            request.customerNote(),
            null,
            AppointmentBookingChannel.WEBSITE_GUEST,
            null
        );
        return toResponse(saved);
    }

    @Transactional
    public AppointmentResponse createForCustomer(Long customerId, CustomerCreateAppointmentRequest request) {
        if (request.startAt().isBefore(OffsetDateTime.now())) {
            throw new BadRequestException("Appointment time must be in the future.");
        }
        Appointment saved = createAppointment(
            customerId,
            null,
            null,
            null,
            request.staffId(),
            request.branchId(),
            request.serviceId(),
            request.startAt(),
            request.endAt(),
            AppointmentStatus.BOOKED,
            request.depositAmount(),
            request.customerNote(),
            null,
            AppointmentBookingChannel.CUSTOMER_APP,
            customerId
        );
        return toResponse(saved);
    }

    public List<AppointmentResponse> list(OffsetDateTime from, OffsetDateTime to, Long branchId, AppointmentStatus status, String query) {
        if (branchId != null) {
            branchService.requireBranch(branchId);
        }
        if (from != null && to != null && to.isBefore(from)) {
            throw new BadRequestException("Invalid appointment range: 'to' must be on or after 'from'.");
        }

        OffsetDateTime effectiveFrom = from == null ? SEARCH_MIN_START_AT : from;
        OffsetDateTime effectiveTo = to == null ? SEARCH_MAX_START_AT : to;
        boolean filterByBranch = branchId != null;
        boolean filterByStatus = status != null;

        List<Appointment> appointments = appointmentRepository.search(
            effectiveFrom,
            effectiveTo,
            filterByBranch,
            branchId,
            filterByStatus,
            status,
            query == null ? "" : query.trim()
        );
        return appointments.stream().map(this::toResponse).toList();
    }

    public List<AppointmentResponse> listForCustomer(Long customerId) {
        return appointmentRepository.findByCustomerIdDetailed(customerId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public AppointmentResponse update(Long id, UpdateAppointmentRequest request) {
        Appointment appointment = getAppointment(id);
        if (appointment.getConvertedTransaction() != null || hasReceipt(appointment)) {
            throw new BadRequestException("Converted appointments cannot be edited.");
        }
        if (appointment.getStatus() == AppointmentStatus.COMPLETED || appointment.getStatus() == AppointmentStatus.CANCELLED) {
            throw new BadRequestException("Completed or cancelled appointments cannot be edited.");
        }

        AppointmentResponse before = toResponse(appointment);
        Customer customer = resolveCustomer(request.customerId());
        StaffProfile staff = resolveStaff(request.staffId());
        ServiceItem service = resolveService(request.serviceId());
        Long resolvedBranchId = branchService.requireBranch(request.branchId()).getId();

        String trimmedGuestName = blankToNull(request.guestName());
        String trimmedGuestPhone = blankToNull(request.guestPhone());
        String trimmedGuestEmail = emailAddressService.normalizeOptional(request.guestEmail());
        String guestPhoneNormalized = trimmedGuestPhone == null ? null : phoneNumberService.normalize(trimmedGuestPhone);

        if (customer == null) {
            if (trimmedGuestName == null || guestPhoneNormalized == null || guestPhoneNormalized.isBlank()) {
                throw new BadRequestException("Guest name and phone are required when no customer is linked.");
            }
        }

        OffsetDateTime resolvedEndAt = resolveEndAt(request.startAt(), request.endAt(), service);
        validateStaffAvailability(staff, request.startAt(), resolvedEndAt, appointment.getId());

        appointment.setCustomer(customer);
        appointment.setGuestName(trimmedGuestName);
        appointment.setGuestPhone(trimmedGuestPhone);
        appointment.setGuestPhoneNormalized(guestPhoneNormalized);
        appointment.setGuestEmail(trimmedGuestEmail);
        appointment.setStaff(staff);
        appointment.setService(service);
        appointment.setBranchId(resolvedBranchId);
        appointment.setStartAt(request.startAt());
        appointment.setEndAt(resolvedEndAt);
        appointment.setDepositAmount(request.depositAmount() == null ? BigDecimal.ZERO.setScale(2) : request.depositAmount());
        appointment.setCustomerNote(blankToNull(request.customerNote()));
        appointment.setInternalNote(blankToNull(request.internalNote()));
        appointment.setUpdatedAt(OffsetDateTime.now());

        Appointment saved = appointmentRepository.save(appointment);
        AppointmentResponse after = toResponse(saved);
        auditLogService.log("APPOINTMENT_UPDATED", "appointment", saved.getId(), before, after);
        return after;
    }

    @Transactional
    public AppointmentResponse updateStatus(Long id, UpdateAppointmentStatusRequest request) {
        if (request.status() == AppointmentStatus.CANCELLED) {
            throw new BadRequestException("Use the cancel endpoint to cancel appointments.");
        }
        if (request.status() == AppointmentStatus.COMPLETED) {
            throw new BadRequestException("Use POS checkout to complete appointments and generate a receipt.");
        }
        Appointment appointment = getAppointment(id);
        AppointmentResponse before = toResponse(appointment);
        appointment.setStatus(request.status());
        appointment.setUpdatedAt(OffsetDateTime.now());
        Appointment saved = appointmentRepository.save(appointment);
        AppointmentResponse after = toResponse(saved);
        auditLogService.log("APPOINTMENT_STATUS_UPDATED", "appointment", saved.getId(), before, after);
        return after;
    }

    @Transactional
    public AppointmentResponse cancelInternal(Long id, CancelAppointmentRequest request) {
        Appointment appointment = getAppointment(id);
        cancelAppointment(appointment, request.reason(), AppointmentCancellationActorType.INTERNAL_USER, null);
        return toResponse(appointmentRepository.save(appointment));
    }

    @Transactional
    public AppointmentResponse cancelByCustomer(Long customerId, String bookingReference, CancelAppointmentRequest request) {
        Appointment appointment = getByBookingReference(bookingReference);
        if (appointment.getCustomer() == null || !appointment.getCustomer().getId().equals(customerId)) {
            throw new NotFoundException("Appointment not found.");
        }
        cancelAppointment(appointment, request.reason(), AppointmentCancellationActorType.CUSTOMER, customerId);
        return toResponse(appointmentRepository.save(appointment));
    }

    @Transactional
    public AppointmentResponse cancelGuest(String bookingReference, String reason) {
        Appointment appointment = getByBookingReference(bookingReference);
        if (appointment.getCustomer() != null) {
            throw new BadRequestException("This appointment is linked to a customer account.");
        }
        cancelAppointment(appointment, reason, AppointmentCancellationActorType.GUEST, null);
        return toResponse(appointmentRepository.save(appointment));
    }

    @Transactional
    public CreateTransactionResponse convertToBill(Long appointmentId, ConvertAppointmentToBillRequest request) {
        Appointment appointment = getAppointment(appointmentId);

        if (appointment.getStatus() == AppointmentStatus.CANCELLED || appointment.getStatus() == AppointmentStatus.NO_SHOW) {
            throw new BadRequestException("Appointment status is not eligible for conversion.");
        }
        if (appointment.getConvertedTransaction() != null) {
            throw new BadRequestException("Appointment has already been converted to a bill.");
        }
        if (appointment.getService() == null || appointment.getStaff() == null) {
            throw new BadRequestException("Appointment must have assigned service and staff before conversion.");
        }

        CreateTransactionRequest.LineRequest lineRequest = new CreateTransactionRequest.LineRequest(
            appointment.getService().getId(),
            1,
            BigDecimal.ZERO,
            appointment.getStaff().getId()
        );

        List<CreateTransactionRequest.PaymentRequest> payments = request.payments().stream()
            .map(p -> new CreateTransactionRequest.PaymentRequest(p.method(), p.amount(), p.referenceNo(), null, null))
            .toList();

        CreateTransactionRequest txnRequest = new CreateTransactionRequest(
            appointment.getBranchId(),
            appointment.getId(),
            appointment.getCustomer() == null ? null : appointment.getCustomer().getId(),
            request.customerVoucherId(),
            request.cashierId(),
            List.of(lineRequest),
            payments,
            request.discountTotal()
        );

        return transactionService.create(txnRequest);
    }

    @Transactional
    public void attachGuestAppointmentsToCustomer(Customer customer) {
        attachGuestAppointmentsByPhone(customer);
        attachGuestAppointmentsByEmail(customer);
    }

    public List<Appointment> findReminderCandidates() {
        OffsetDateTime now = OffsetDateTime.now();
        return appointmentRepository.findReminderCandidates(now, now.plusHours(loyaltySettingsService.getReminderLeadHours()));
    }

    public Appointment getByBookingReferenceForPublic(String bookingReference) {
        Appointment appointment = getByBookingReference(bookingReference);
        if (appointment.getCustomer() != null) {
            throw new BadRequestException("This appointment is linked to a customer account.");
        }
        return appointment;
    }

    @Transactional
    public void sendReminder(Long appointmentId) {
        Appointment appointment = getAppointment(appointmentId);
        try {
            appointmentNotificationService.sendReminder(appointment);
            appointment.setReminderEmailSentAt(OffsetDateTime.now());
            appointment.setUpdatedAt(OffsetDateTime.now());
            appointmentRepository.save(appointment);
        } catch (RuntimeException ignored) {
            // Keep appointment state even if reminder delivery fails.
        }
    }

    public AppointmentResponse toResponse(Appointment appointment) {
        String customerName = appointment.getCustomer() == null ? null : appointment.getCustomer().getName();
        String customerPhone = appointment.getCustomer() == null ? null : appointment.getCustomer().getPhone();
        String customerEmail = appointment.getCustomer() == null ? null : appointment.getCustomer().getEmail();
        return new AppointmentResponse(
            appointment.getId(),
            appointment.getBookingReference(),
            appointment.getCustomer() == null ? null : appointment.getCustomer().getId(),
            customerName,
            customerPhone,
            customerEmail,
            appointment.getGuestName(),
            appointment.getGuestPhone(),
            appointment.getGuestEmail(),
            customerName != null ? customerName : appointment.getGuestName(),
            customerPhone != null ? customerPhone : appointment.getGuestPhone(),
            appointment.getStaff() == null ? null : appointment.getStaff().getId(),
            appointment.getStaff() == null ? null : appointment.getStaff().getDisplayName(),
            appointment.getBranchId(),
            appointment.getService() == null ? null : appointment.getService().getId(),
            appointment.getService() == null ? null : appointment.getService().getName(),
            appointment.getBookingChannel().name(),
            appointment.getStartAt(),
            appointment.getEndAt(),
            appointment.getStatus(),
            appointment.getDepositAmount(),
            appointment.getCustomerNote(),
            appointment.getInternalNote(),
            appointment.getCancellationReason(),
            appointment.getCreatedByCustomer() == null ? null : appointment.getCreatedByCustomer().getId(),
            appointment.getConvertedTransaction() == null ? null : appointment.getConvertedTransaction().getId(),
            appointment.getReceiptNo(),
            appointment.getCreatedAt(),
            appointment.getConfirmationEmailSentAt(),
            appointment.getReminderEmailSentAt()
        );
    }

    private Appointment createAppointment(
        Long customerId,
        String guestName,
        String guestPhone,
        String guestEmail,
        Long staffId,
        Long branchId,
        Long serviceId,
        OffsetDateTime startAt,
        OffsetDateTime endAt,
        AppointmentStatus status,
        BigDecimal depositAmount,
        String customerNote,
        String internalNote,
        AppointmentBookingChannel bookingChannel,
        Long createdByCustomerId
    ) {
        Long resolvedBranchId = branchService.requireBranch(branchId).getId();
        Customer customer = resolveCustomer(customerId);
        StaffProfile staff = resolveStaff(staffId);
        ServiceItem service = resolveService(serviceId);

        String trimmedGuestName = blankToNull(guestName);
        String trimmedGuestPhone = blankToNull(guestPhone);
        String trimmedGuestEmail = emailAddressService.normalizeOptional(guestEmail);
        String guestPhoneNormalized = trimmedGuestPhone == null ? null : phoneNumberService.normalize(trimmedGuestPhone);

        if (customer == null) {
            if (trimmedGuestName == null || guestPhoneNormalized == null || guestPhoneNormalized.isBlank()) {
                throw new BadRequestException("Guest name and phone are required when no customer is linked.");
            }
        }

        OffsetDateTime resolvedEndAt = resolveEndAt(startAt, endAt, service);
        validateStaffAvailability(staff, startAt, resolvedEndAt, null);

        Appointment appointment = new Appointment();
        appointment.setCustomer(customer);
        appointment.setGuestName(trimmedGuestName);
        appointment.setGuestPhone(trimmedGuestPhone);
        appointment.setGuestPhoneNormalized(guestPhoneNormalized);
        appointment.setGuestEmail(trimmedGuestEmail);
        appointment.setStaff(staff);
        appointment.setService(service);
        appointment.setBranchId(resolvedBranchId);
        appointment.setStartAt(startAt);
        appointment.setEndAt(resolvedEndAt);
        appointment.setStatus(status);
        appointment.setBookingChannel(bookingChannel);
        appointment.setDepositAmount(depositAmount == null ? BigDecimal.ZERO.setScale(2) : depositAmount);
        appointment.setCustomerNote(blankToNull(customerNote));
        appointment.setInternalNote(blankToNull(internalNote));
        appointment.setBookingReference(generateBookingReference());
        appointment.setCreatedByCustomer(resolveCustomer(createdByCustomerId));
        appointment.setCreatedAt(OffsetDateTime.now());
        appointment.setUpdatedAt(OffsetDateTime.now());

        Appointment saved = appointmentRepository.save(appointment);
        auditLogService.log("APPOINTMENT_CREATED", "appointment", saved.getId(), null, toResponse(saved));
        sendBookingConfirmation(saved);
        return saved;
    }

    private void cancelAppointment(Appointment appointment, String reason, AppointmentCancellationActorType actorType, Long actorId) {
        if (appointment.getStatus() == AppointmentStatus.CANCELLED) {
            throw new BadRequestException("Appointment is already cancelled.");
        }
        if (appointment.getConvertedTransaction() != null || hasReceipt(appointment)) {
            throw new BadRequestException("Converted appointments cannot be cancelled.");
        }

        AppointmentResponse before = toResponse(appointment);
        appointment.setStatus(AppointmentStatus.CANCELLED);
        appointment.setCancellationReason(reason.trim());
        appointment.setCancelledAt(OffsetDateTime.now());
        appointment.setCancelledByType(actorType);
        appointment.setCancelledById(actorId);
        appointment.setUpdatedAt(OffsetDateTime.now());
        auditLogService.log("APPOINTMENT_CANCELLED", "appointment", appointment.getId(), before, toResponse(appointment));
    }

    private void sendBookingConfirmation(Appointment appointment) {
        try {
            appointmentNotificationService.sendBookingConfirmation(appointment);
            appointment.setConfirmationEmailSentAt(OffsetDateTime.now());
            appointment.setUpdatedAt(OffsetDateTime.now());
            appointmentRepository.save(appointment);
        } catch (RuntimeException ignored) {
            // Booking should still succeed even if email delivery fails.
        }
    }

    private void attachGuestAppointmentsByPhone(Customer customer) {
        if (customer.getPhoneNormalized() == null || customer.getPhoneNormalized().isBlank()) {
            return;
        }

        for (Appointment appointment : appointmentRepository.findGuestAppointmentsByPhoneNormalized(customer.getPhoneNormalized())) {
            attachGuestAppointment(appointment, customer);
        }
    }

    private void attachGuestAppointmentsByEmail(Customer customer) {
        if (customer.getEmail() == null || customer.getEmail().isBlank()) {
            return;
        }

        for (Appointment appointment : appointmentRepository.findGuestAppointmentsByGuestEmail(customer.getEmail())) {
            attachGuestAppointment(appointment, customer);
        }
    }

    private void attachGuestAppointment(Appointment appointment, Customer customer) {
        if (appointment.getCustomer() != null) {
            return;
        }
        appointment.setCustomer(customer);
        appointment.setUpdatedAt(OffsetDateTime.now());
        appointmentRepository.save(appointment);
    }

    private Appointment getAppointment(Long id) {
        return appointmentRepository.findDetailedById(id)
            .orElseThrow(() -> new NotFoundException("Appointment not found: " + id));
    }

    private Appointment getByBookingReference(String bookingReference) {
        String normalized = bookingReference == null ? "" : bookingReference.trim();
        return appointmentRepository.findByBookingReferenceDetailed(normalized)
            .orElseThrow(() -> new NotFoundException("Appointment not found: " + normalized));
    }

    private Customer resolveCustomer(Long customerId) {
        if (customerId == null) {
            return null;
        }
        return customerRepository.findById(customerId)
            .orElseThrow(() -> new NotFoundException("Customer not found: " + customerId));
    }

    private StaffProfile resolveStaff(Long staffId) {
        if (staffId == null) {
            return null;
        }
        return staffProfileRepository.findById(staffId)
            .orElseThrow(() -> new NotFoundException("Staff not found: " + staffId));
    }

    private ServiceItem resolveService(Long serviceId) {
        if (serviceId == null) {
            return null;
        }
        return serviceItemRepository.findById(serviceId)
            .orElseThrow(() -> new NotFoundException("Service not found: " + serviceId));
    }

    private OffsetDateTime resolveEndAt(OffsetDateTime startAt, OffsetDateTime endAt, ServiceItem service) {
        if (endAt != null) {
            if (!endAt.isAfter(startAt)) {
                throw new BadRequestException("Appointment end time must be after start time.");
            }
            return endAt;
        }
        if (service != null && service.getDurationMinutes() != null && service.getDurationMinutes() > 0) {
            return startAt.plusMinutes(service.getDurationMinutes());
        }
        return startAt.plusHours(1);
    }

    private void validateStaffAvailability(StaffProfile staff, OffsetDateTime startAt, OffsetDateTime endAt, Long excludeId) {
        if (staff == null) {
            return;
        }
        if (appointmentRepository.countOverlappingForStaff(staff.getId(), startAt, endAt, excludeId) > 0) {
            throw new BadRequestException("Selected staff member already has an overlapping appointment.");
        }
    }

    private String generateBookingReference() {
        return "APT-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();
    }

    private boolean hasReceipt(Appointment appointment) {
        return appointment.getReceiptNo() != null && !appointment.getReceiptNo().isBlank();
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
