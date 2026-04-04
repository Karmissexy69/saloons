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
import java.time.LocalDate;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "customers")
public class Customer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(unique = true)
    private String phone;

    private String email;

    private LocalDate birthday;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "favorite_staff_id")
    private StaffProfile favoriteStaff;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "secondary_favorite_staff_id")
    private StaffProfile secondaryFavoriteStaff;

    @Column(name = "points_balance", nullable = false)
    private int pointsBalance;

    @Column(name = "total_spend", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalSpend;

    @Column(name = "total_visits", nullable = false)
    private int totalVisits;

    @Column(name = "last_visit_at")
    private OffsetDateTime lastVisitAt;

    @Column(name = "marketing_opt_in", nullable = false)
    private boolean marketingOptIn;

    @Column(name = "phone_normalized")
    private String phoneNormalized;

    @Column(nullable = false)
    private String status;

    private String notes;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
