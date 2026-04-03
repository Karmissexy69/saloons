package com.salonpos.service;

import com.salonpos.domain.Appointment;
import com.salonpos.domain.AppointmentStatus;
import com.salonpos.domain.Customer;
import com.salonpos.domain.SalesTransaction;
import com.salonpos.domain.ServiceItem;
import com.salonpos.domain.StaffProfile;
import com.salonpos.dto.AppointmentResponse;
import com.salonpos.dto.ConvertAppointmentToBillRequest;
import com.salonpos.dto.CreateAppointmentRequest;
import com.salonpos.dto.CreateTransactionRequest;
import com.salonpos.dto.CreateTransactionResponse;
import com.salonpos.dto.UpdateAppointmentStatusRequest;
import com.salonpos.exception.BadRequestException;
import com.salonpos.exception.NotFoundException;
import com.salonpos.repository.AppointmentRepository;
import com.salonpos.repository.CustomerRepository;
import com.salonpos.repository.SalesTransactionRepository;
import com.salonpos.repository.ServiceItemRepository;
import com.salonpos.repository.StaffProfileRepository;
import jakarta.transaction.Transactional;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final CustomerRepository customerRepository;
    private final StaffProfileRepository staffProfileRepository;
    private final ServiceItemRepository serviceItemRepository;
    private final SalesTransactionRepository salesTransactionRepository;
    private final TransactionService transactionService;
    private final BranchService branchService;
    private final AuditLogService auditLogService;

    public AppointmentService(
        AppointmentRepository appointmentRepository,
        CustomerRepository customerRepository,
        StaffProfileRepository staffProfileRepository,
        ServiceItemRepository serviceItemRepository,
        SalesTransactionRepository salesTransactionRepository,
        TransactionService transactionService,
        BranchService branchService,
        AuditLogService auditLogService
    ) {
        this.appointmentRepository = appointmentRepository;
        this.customerRepository = customerRepository;
        this.staffProfileRepository = staffProfileRepository;
        this.serviceItemRepository = serviceItemRepository;
        this.salesTransactionRepository = salesTransactionRepository;
        this.transactionService = transactionService;
        this.branchService = branchService;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public AppointmentResponse create(CreateAppointmentRequest request) {
        Long branchId = branchService.requireBranch(request.branchId()).getId();
        Appointment appointment = new Appointment();
        appointment.setCustomer(resolveCustomer(request.customerId()));
        appointment.setStaff(resolveStaff(request.staffId()));
        appointment.setService(resolveService(request.serviceId()));
        appointment.setBranchId(branchId);
        appointment.setStartAt(request.startAt());
        appointment.setEndAt(request.endAt());
        appointment.setStatus(request.status() == null ? AppointmentStatus.BOOKED : request.status());
        appointment.setDepositAmount(request.depositAmount());
        appointment.setNotes(request.notes());
        appointment.setCreatedAt(OffsetDateTime.now());

        Appointment saved = appointmentRepository.save(appointment);
        auditLogService.log("APPOINTMENT_CREATED", "appointment", saved.getId(), null, toResponse(saved));
        return toResponse(saved);
    }

    public List<AppointmentResponse> list(OffsetDateTime from, OffsetDateTime to, Long branchId, AppointmentStatus status) {
        if (branchId != null) {
            branchService.requireBranch(branchId);
        }
        if (from != null && to != null && to.isBefore(from)) {
            throw new BadRequestException("Invalid appointment range: 'to' must be on or after 'from'.");
        }

        List<Appointment> appointments = appointmentRepository.search(from, to, branchId, status);
        return appointments.stream().map(this::toResponse).toList();
    }

    @Transactional
    public AppointmentResponse updateStatus(Long id, UpdateAppointmentStatusRequest request) {
        Appointment appointment = getAppointment(id);
        AppointmentResponse before = toResponse(appointment);
        appointment.setStatus(request.status());
        Appointment saved = appointmentRepository.save(appointment);
        AppointmentResponse after = toResponse(saved);
        auditLogService.log("APPOINTMENT_STATUS_UPDATED", "appointment", saved.getId(), before, after);
        return after;
    }

    @Transactional
    public CreateTransactionResponse convertToBill(Long appointmentId, ConvertAppointmentToBillRequest request) {
        Appointment appointment = getAppointment(appointmentId);

        if (appointment.getStatus() == AppointmentStatus.CANCELLED
            || appointment.getStatus() == AppointmentStatus.NO_SHOW
            || appointment.getStatus() == AppointmentStatus.COMPLETED) {
            throw new BadRequestException("Appointment status is not eligible for conversion.");
        }

        if (appointment.getService() == null || appointment.getStaff() == null) {
            throw new BadRequestException("Appointment must have assigned service and staff before conversion.");
        }

        CreateTransactionRequest.LineRequest lineRequest = new CreateTransactionRequest.LineRequest(
            appointment.getService().getId(),
            1,
            java.math.BigDecimal.ZERO,
            appointment.getStaff().getId()
        );

        List<CreateTransactionRequest.PaymentRequest> payments = request.payments().stream()
            .map(p -> new CreateTransactionRequest.PaymentRequest(p.method(), p.amount(), p.referenceNo(), null, null))
            .toList();

        CreateTransactionRequest txnRequest = new CreateTransactionRequest(
            appointment.getBranchId(),
            appointment.getCustomer() == null ? null : appointment.getCustomer().getId(),
            request.cashierId(),
            List.of(lineRequest),
            payments,
            request.discountTotal()
        );

        CreateTransactionResponse response = transactionService.create(txnRequest);

        SalesTransaction transaction = salesTransactionRepository.findById(response.transactionId())
            .orElseThrow(() -> new NotFoundException("Transaction not found after conversion."));

        AppointmentResponse before = toResponse(appointment);
        appointment.setConvertedTransaction(transaction);
        appointment.setStatus(AppointmentStatus.COMPLETED);
        appointmentRepository.save(appointment);
        auditLogService.log("APPOINTMENT_CONVERTED_TO_BILL", "appointment", appointment.getId(), before, toResponse(appointment));

        return response;
    }

    private Appointment getAppointment(Long id) {
        return appointmentRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Appointment not found: " + id));
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

    private AppointmentResponse toResponse(Appointment appointment) {
        return new AppointmentResponse(
            appointment.getId(),
            appointment.getCustomer() == null ? null : appointment.getCustomer().getId(),
            appointment.getStaff() == null ? null : appointment.getStaff().getId(),
            appointment.getBranchId(),
            appointment.getService() == null ? null : appointment.getService().getId(),
            appointment.getStartAt(),
            appointment.getEndAt(),
            appointment.getStatus(),
            appointment.getDepositAmount(),
            appointment.getNotes(),
            appointment.getConvertedTransaction() == null ? null : appointment.getConvertedTransaction().getId()
        );
    }
}
