package com.salonpos.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.salonpos.domain.Customer;
import com.salonpos.domain.Payment;
import com.salonpos.domain.Receipt;
import com.salonpos.domain.SalesTransaction;
import com.salonpos.domain.ServiceItem;
import com.salonpos.domain.TransactionLine;
import com.salonpos.domain.TransactionStatus;
import com.salonpos.dto.CreateTransactionRequest;
import com.salonpos.dto.CreateTransactionResponse;
import com.salonpos.exception.BadRequestException;
import com.salonpos.exception.NotFoundException;
import com.salonpos.repository.CustomerRepository;
import com.salonpos.repository.ReceiptRepository;
import com.salonpos.repository.SalesTransactionRepository;
import com.salonpos.repository.ServiceItemRepository;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class TransactionService {

    private final CustomerRepository customerRepository;
    private final ServiceItemRepository serviceItemRepository;
    private final SalesTransactionRepository salesTransactionRepository;
    private final ReceiptRepository receiptRepository;
    private final CommissionService commissionService;
    private final AuditLogService auditLogService;
    private final ReceiptNumberGenerator receiptNumberGenerator;
    private final ObjectMapper objectMapper;

    public TransactionService(
        CustomerRepository customerRepository,
        ServiceItemRepository serviceItemRepository,
        SalesTransactionRepository salesTransactionRepository,
        ReceiptRepository receiptRepository,
        CommissionService commissionService,
        AuditLogService auditLogService,
        ReceiptNumberGenerator receiptNumberGenerator,
        ObjectMapper objectMapper
    ) {
        this.customerRepository = customerRepository;
        this.serviceItemRepository = serviceItemRepository;
        this.salesTransactionRepository = salesTransactionRepository;
        this.receiptRepository = receiptRepository;
        this.commissionService = commissionService;
        this.auditLogService = auditLogService;
        this.receiptNumberGenerator = receiptNumberGenerator;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public CreateTransactionResponse create(CreateTransactionRequest request) {
        Map<Long, ServiceItem> serviceById = new HashMap<>();
        serviceItemRepository.findAllById(
                request.lines().stream().map(CreateTransactionRequest.LineRequest::serviceId).toList())
            .forEach(service -> serviceById.put(service.getId(), service));

        if (serviceById.size() != request.lines().size()) {
            throw new NotFoundException("One or more service IDs are invalid.");
        }

        Customer customer = null;
        if (request.customerId() != null) {
            customer = customerRepository.findById(request.customerId())
                .orElseThrow(() -> new NotFoundException("Customer not found: " + request.customerId()));
        }

        BigDecimal subtotal = BigDecimal.ZERO;
        List<TransactionLine> lines = new ArrayList<>();

        for (CreateTransactionRequest.LineRequest lineRequest : request.lines()) {
            ServiceItem service = serviceById.get(lineRequest.serviceId());
            BigDecimal lineTotal = service.getPrice().multiply(BigDecimal.valueOf(lineRequest.qty()));
            subtotal = subtotal.add(lineTotal);

            TransactionLine line = new TransactionLine();
            line.setService(service);
            line.setQty(lineRequest.qty());
            line.setUnitPrice(service.getPrice());
            line.setDiscountAmount(scale(lineRequest.discountAmount()));
            line.setAssignedStaffId(lineRequest.assignedStaffId());
            lines.add(line);
        }

        subtotal = scale(subtotal);
        BigDecimal total = scale(subtotal.subtract(scale(request.discountTotal())));
        if (total.compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("Total cannot be negative after discounts.");
        }

        BigDecimal paymentTotal = request.payments().stream()
            .map(CreateTransactionRequest.PaymentRequest::amount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (scale(paymentTotal).compareTo(total) != 0) {
            throw new BadRequestException("Payment total must equal final bill total.");
        }

        SalesTransaction transaction = new SalesTransaction();
        transaction.setReceiptNo(receiptNumberGenerator.next(request.branchId()));
        transaction.setBranchId(request.branchId());
        transaction.setCustomer(customer);
        transaction.setCashierId(request.cashierId());
        transaction.setStatus(TransactionStatus.PAID);
        transaction.setSubtotal(subtotal);
        transaction.setDiscountTotal(scale(request.discountTotal()));
        transaction.setTotal(total);
        transaction.setSoldAt(OffsetDateTime.now());

        for (TransactionLine line : lines) {
            line.setTransaction(transaction);
            transaction.getLines().add(line);
        }

        for (CreateTransactionRequest.PaymentRequest paymentRequest : request.payments()) {
            Payment payment = new Payment();
            payment.setTransaction(transaction);
            payment.setMethod(paymentRequest.method());
            payment.setAmount(scale(paymentRequest.amount()));
            payment.setReferenceNo(paymentRequest.referenceNo());
            transaction.getPayments().add(payment);
        }

        salesTransactionRepository.save(transaction);
        commissionService.generateForPaidTransaction(transaction);

        Receipt receipt = new Receipt();
        receipt.setTransaction(transaction);
        receipt.setReceiptNo(transaction.getReceiptNo());
        receipt.setReceiptJson(buildReceiptJson(transaction));
        receipt.setSentStatus("GENERATED");
        receipt.setGeneratedAt(OffsetDateTime.now());
        receiptRepository.save(receipt);

        CreateTransactionResponse response = new CreateTransactionResponse(
            transaction.getId(),
            transaction.getReceiptNo(),
            transaction.getSubtotal(),
            transaction.getDiscountTotal(),
            transaction.getTotal());
        auditLogService.log("TRANSACTION_CREATED", "transaction", transaction.getId(), null, response);
        return response;
    }

    private String buildReceiptJson(SalesTransaction transaction) {
        Map<String, Object> root = new HashMap<>();
        root.put("receiptNo", transaction.getReceiptNo());
        root.put("branchId", transaction.getBranchId());
        root.put("cashierId", transaction.getCashierId());
        root.put("soldAt", transaction.getSoldAt());
        root.put("subtotal", transaction.getSubtotal());
        root.put("discountTotal", transaction.getDiscountTotal());
        root.put("total", transaction.getTotal());

        List<Map<String, Object>> items = transaction.getLines().stream().map(line -> {
            Map<String, Object> lineMap = new HashMap<>();
            lineMap.put("serviceId", line.getService().getId());
            lineMap.put("serviceName", line.getService().getName());
            lineMap.put("qty", line.getQty());
            lineMap.put("unitPrice", line.getUnitPrice());
            lineMap.put("discountAmount", line.getDiscountAmount());
            lineMap.put("assignedStaffId", line.getAssignedStaffId());
            return lineMap;
        }).toList();

        root.put("items", items);

        List<Map<String, Object>> payments = transaction.getPayments().stream().map(payment -> {
            Map<String, Object> paymentMap = new HashMap<>();
            paymentMap.put("method", payment.getMethod());
            paymentMap.put("amount", payment.getAmount());
            paymentMap.put("referenceNo", payment.getReferenceNo());
            return paymentMap;
        }).toList();

        root.put("payments", payments);

        try {
            return objectMapper.writeValueAsString(root);
        } catch (JsonProcessingException e) {
            throw new BadRequestException("Failed to render receipt payload.");
        }
    }

    private BigDecimal scale(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }
}
