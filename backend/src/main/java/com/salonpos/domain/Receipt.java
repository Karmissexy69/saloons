package com.salonpos.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "receipts")
public class Receipt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "transaction_id", nullable = false)
    private SalesTransaction transaction;

    @Column(name = "receipt_no", nullable = false, unique = true)
    private String receiptNo;

    @Column(name = "receipt_json", nullable = false, columnDefinition = "TEXT")
    private String receiptJson;

    @Column(name = "sent_status", nullable = false)
    private String sentStatus;

    @Column(name = "generated_at", nullable = false)
    private OffsetDateTime generatedAt;
}
