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
@Table(name = "customer_vouchers")
public class CustomerVoucher {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "voucher_catalog_id", nullable = false)
    private VoucherCatalog voucherCatalog;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CustomerVoucherStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "used_transaction_id")
    private SalesTransaction usedTransaction;

    @Column(name = "expires_at")
    private OffsetDateTime expiresAt;

    @Column(name = "redeemed_at", nullable = false)
    private OffsetDateTime redeemedAt;

    @Column(name = "used_at")
    private OffsetDateTime usedAt;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
