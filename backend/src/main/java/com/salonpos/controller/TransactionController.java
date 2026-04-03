package com.salonpos.controller;

import com.salonpos.dto.CreateTransactionRequest;
import com.salonpos.dto.CreateTransactionResponse;
import com.salonpos.service.TransactionService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private final TransactionService transactionService;

    public TransactionController(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @PostMapping
    public CreateTransactionResponse create(@Valid @RequestBody CreateTransactionRequest request) {
        return transactionService.create(request);
    }
}
