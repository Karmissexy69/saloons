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
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "refunds")
public class Refund {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "transaction_id", nullable = false)
    private SalesTransaction transaction;

    @Column(name = "approved_by", nullable = false)
    private Long approvedBy;

    @Column(nullable = false)
    private String reason;

    @Column(name = "total_refund", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalRefund;

    @Column(name = "refunded_at", nullable = false)
    private OffsetDateTime refundedAt;
}
