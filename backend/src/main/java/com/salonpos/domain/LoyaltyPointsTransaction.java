package com.salonpos.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name = "loyalty_points_transactions")
public class LoyaltyPointsTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Column(name = "transaction_id")
    private Long transactionId;

    @Column(name = "refund_id")
    private Long refundId;

    @Column(name = "customer_voucher_id")
    private Long customerVoucherId;

    @Column(name = "appointment_id")
    private Long appointmentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "entry_type", nullable = false)
    private LoyaltyPointsEntryType entryType;

    @Column(name = "points_delta", nullable = false)
    private int pointsDelta;

    @Column(name = "balance_after", nullable = false)
    private int balanceAfter;

    @Column
    private String remarks;

    @Column(name = "actor_user_id")
    private Long actorUserId;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;
}
