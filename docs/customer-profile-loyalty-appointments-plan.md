# Customer Profile, Loyalty, and Appointment Expansion Plan

## Objective
Extend the current backend so it can support:

- richer customer profiles
- loyalty points accumulation and redemption
- voucher configuration and redemption
- customer OTP login for a future separate customer-facing frontend
- customer and guest appointment booking/cancellation
- internal appointment management in the existing POS frontend

This plan is grounded in the current codebase:

- `customers` already exists but is minimal
- `appointments` already exists but is POS-only
- `app_settings` already exists and is the right place for loyalty/voucher config
- current auth only supports POS users via `/api/auth/login`

## Current State

### Existing backend pieces
- `customers` table currently stores `name`, `phone`, `email`, `birthday`, `notes`
- `appointments` supports `customer_id`, `staff_id`, `branch_id`, `service_id`, `start_at`, `status`, `deposit_amount`
- `TransactionService` already links a transaction to a customer when `customerId` is present
- `RefundService` already has the right lifecycle hook for loyalty reversal
- `app_settings` is a generic key/value store and can hold loyalty and voucher configuration
- security rules currently allow only POS users to access `/api/appointments/**`

### Existing frontend pieces
- internal `AppointmentsPage` already exists in the current frontend
- current appointment UI does not capture customer identity, guest details, cancellation, or availability
- current settings UI can be expanded, or a dedicated loyalty/voucher page can be added to the internal sidenav

## Recommended Functional Scope

### 1. Customer profile
- extend customer records beyond basic contact details
- support search by phone and name from POS
- support a future customer app profile endpoint

### 2. Loyalty points
- customer earns points from paid transactions
- earn percentage is configurable by IT admin
- every point movement is recorded in a ledger table
- points are reduced when vouchers are redeemed
- refunds should reverse points proportionally

### 3. Voucher system
- IT admin defines voucher catalog and points cost
- customers exchange points for vouchers
- redeemed vouchers can later be applied in checkout or tracked for later use

### 4. Customer auth
- separate customer auth flow from POS auth
- login by phone number + OTP
- future customer-facing frontend consumes separate customer APIs and token

### 5. Appointment booking
- logged-in customers can create/cancel appointments
- guests can also create appointments without full registration
- internal POS frontend can view and act on those same appointments

## Data Model Plan

## 1) Extend `customers`
Prefer extending the existing `customers` table instead of introducing a second profile table.

Recommended new columns:

- `favorite_staff_id BIGINT NULL`
- `secondary_favorite_staff_id BIGINT NULL`
- `points_balance INT NOT NULL DEFAULT 0`
- `total_spend NUMERIC(12,2) NOT NULL DEFAULT 0`
- `total_visits INT NOT NULL DEFAULT 0`
- `last_visit_at TIMESTAMPTZ NULL`
- `marketing_opt_in BOOLEAN NOT NULL DEFAULT FALSE`
- `phone_normalized VARCHAR(40)` if we want E.164 storage separate from display phone
- `status VARCHAR(40) NOT NULL DEFAULT 'ACTIVE'`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Notes:
- keep `phone` unique, but normalize it before save
- support one primary favorite and one backup favorite staff member
- `points_balance` is a cached balance; the ledger remains the source of truth

## 2) Loyalty ledger table
Use a ledger table instead of only storing the balance.

Recommended table: `loyalty_points_transactions`

Suggested columns:

- `id`
- `customer_id`
- `transaction_id NULL`
- `refund_id NULL`
- `voucher_redemption_id NULL`
- `appointment_id NULL`
- `entry_type` such as `EARN`, `REDEEM`, `REFUND_REVERSAL`, `MANUAL_ADJUSTMENT`, `EXPIRY`
- `points_delta INT NOT NULL`
- `balance_after INT NOT NULL`
- `remarks TEXT NULL`
- `actor_user_id NULL`
- `created_at`

Reasoning:
- full audit trail for debit/credit
- easier reconciliation when points look wrong
- can show customer statement in future app

## 3) Voucher tables
Do not use only one `vouchers` table. Split catalog from customer-owned redemptions.

Recommended tables:

### `voucher_catalog`
- `id`
- `code`
- `name`
- `description`
- `voucher_type` such as `FIXED_AMOUNT`, `PERCENTAGE`, `SERVICE`
- `discount_value`
- `points_cost`
- `min_spend NULL`
- `branch_id NULL` for branch-specific vouchers
- `active`
- `valid_from NULL`
- `valid_to NULL`
- `daily_redemption_limit NULL`
- `created_at`
- `updated_at`

### `customer_vouchers`
- `id`
- `customer_id`
- `voucher_catalog_id`
- `status` such as `AVAILABLE`, `USED`, `EXPIRED`, `CANCELLED`
- `redeemed_points_txn_id`
- `used_transaction_id NULL`
- `expires_at NULL`
- `redeemed_at`
- `used_at NULL`

Reasoning:
- voucher definition and actual customer-owned voucher are different concerns
- this supports "exchange points now, use voucher later"

## 4) Customer OTP auth tables
Do not reuse `app_users` for customer login.

Recommended tables:

### `customer_otp_challenges`
- `id`
- `phone`
- `otp_hash`
- `expires_at`
- `attempt_count`
- `max_attempts`
- `consumed_at NULL`
- `channel` such as `SMS`
- `created_at`

### `customer_sessions` or refresh token table
- `id`
- `customer_id`
- `refresh_token_hash`
- `expires_at`
- `revoked_at NULL`
- `device_label NULL`
- `created_at`

Notes:
- hash OTP, never store raw OTP
- if we keep access tokens short-lived, refresh tokens become useful for mobile/web app sessions

## 5) Appointment schema enhancements
The existing `appointments` table needs guest and customer-booking support.

Recommended new columns:

- `guest_name NULL`
- `guest_phone NULL`
- `guest_email NULL`
- `booking_channel VARCHAR(40)` such as `POS`, `CUSTOMER_APP`, `WEBSITE_GUEST`
- `booking_reference VARCHAR(50) UNIQUE`
- `cancellation_reason TEXT NULL`
- `cancelled_at TIMESTAMPTZ NULL`
- `cancelled_by_type VARCHAR(40) NULL`
- `cancelled_by_id BIGINT NULL`
- `customer_note TEXT NULL`
- `internal_note TEXT NULL`
- `created_by_customer_id NULL`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Reasoning:
- guest bookings must still carry contact details
- internal note and customer note should be separated
- booking reference is safer for guest flows than exposing raw IDs

## Business Rules

## Loyalty earning
Recommended default:

- `earned_points = truncate(transaction.total * earn_percent / 100)`
- points are granted only for `PAID` transactions with a linked customer
- use transaction total after discounts
- deposits alone should not generate points until the final paid transaction is completed

Example:

- if total is `291.86` and earn rate is `10%`, awarded points are `29`
- decimals are discarded and never rounded up

Config keys in `app_settings`:

- `loyalty.pointsEarnPercent`
- `loyalty.pointsEnabled`
- `loyalty.pointsRoundingMode`
- `loyalty.voucherRedemptionEnabled`
- `loyalty.scope`

Confirmed behavior:

- points are integer-only
- decimal remainders are discarded
- loyalty is global across all branches

## Loyalty redemption
Recommended flow:

1. customer redeems points into a customer-owned voucher
2. points are debited immediately
3. a `customer_vouchers` row is created
4. later, POS or customer checkout can apply that voucher

This is cleaner than directly converting points into ad hoc order discounts.

Scenario comparison:

### Option A: reusable customer-owned voucher
- customer has `500` points
- they redeem `500` points for a `RM20 Off` voucher on Monday
- voucher is saved in their account as `AVAILABLE`
- they use it days later during checkout

Use this when:
- customers may redeem now and use later
- the future customer app should show a `My Vouchers` wallet
- vouchers need expiry dates, branch restrictions, or campaign rules

### Option B: direct discount on the next sale only
- customer is paying a `RM120` bill at the counter
- they redeem `500` points right there
- current bill immediately gets `RM20` off
- nothing is stored for future use

Use this when:
- redemption only ever happens during checkout
- there is no need for saved vouchers in the app

Recommendation for this project:

- use Option A, reusable customer-owned vouchers
- it fits your future separate customer frontend better
- it also keeps pre-visit redemption and voucher history much cleaner

Confirmed direction:

- voucher redemption will create customer-owned vouchers

## Refund handling
When a refund happens:

- reverse earned points proportionally using the refund ratio
- if a redeemed voucher was used on the refunded sale, define policy explicitly

Recommended first policy:
- restore voucher to `AVAILABLE` only for full refund
- for partial refund, keep voucher used and only reverse earned points

## Appointment rules
- prevent staff double-booking unless overlap is explicitly allowed
- require branch and time slot validation
- allow guest booking without creating a customer record immediately
- auto-create customer later when guest verifies OTP or accepts invite

## API Plan

## 1) Internal POS APIs
These are for current staff-facing operations.

### Customer management
- `GET /api/customers`
- `GET /api/customers/{id}`
- `POST /api/customers`
- `PATCH /api/customers/{id}`
- `GET /api/customers/{id}/points-history`
- `GET /api/customers/{id}/vouchers`
- `POST /api/customers/{id}/points-adjustments`

### Voucher admin
- `GET /api/admin/vouchers`
- `POST /api/admin/vouchers`
- `PATCH /api/admin/vouchers/{id}`

### Loyalty settings
Either keep using generic `app_settings`, or add typed wrapper endpoints:

- `GET /api/admin/loyalty-settings`
- `PUT /api/admin/loyalty-settings`

Recommendation:
- keep persistence in `app_settings`
- expose typed service methods so controllers do not work with raw strings everywhere

## 2) Customer auth APIs
Separate namespace from POS auth.

- `POST /api/customer-auth/request-otp`
- `POST /api/customer-auth/verify-otp`
- `POST /api/customer-auth/refresh`
- `POST /api/customer-auth/logout`

## 3) Customer app APIs
These are for the future separate frontend project.

- `GET /api/customer/me`
- `PATCH /api/customer/me`
- `GET /api/customer/me/points-history`
- `GET /api/customer/me/vouchers`
- `GET /api/customer/me/appointments`
- `POST /api/customer/me/appointments`
- `POST /api/customer/me/appointments/{bookingReference}/cancel`

## 4) Public guest appointment APIs
Needed for non-registered customers coming from landing page.

- `POST /api/public/appointments`
- `POST /api/public/appointments/{bookingReference}/cancel`

Recommendation:
- do not allow guest cancellation by raw appointment ID alone
- require booking reference plus OTP to the guest phone number

## Security Plan

## Token strategy
Do not mix POS and customer tokens blindly.

Recommended approach:

- extend `JwtService` to support token subject type or audience
- issue POS tokens for staff under current `/api/auth/login`
- issue customer tokens under `/api/customer-auth/**`
- customer token should carry `customerId` and a customer scope or role

## Authorization split
Update `SecurityConfig` so:

- POS endpoints remain protected by POS roles
- customer endpoints require customer tokens
- public appointment create and cancel-request endpoints are explicitly permitted

## Rate limiting
Add new policies in the existing rate limiter for:

- customer OTP request by IP and phone
- customer OTP verify by phone
- public appointment create by IP and phone
- public appointment cancel by IP and booking reference

## Notification integration
Recommended abstractions:

- create an `OtpDeliveryService` interface for phone OTP delivery
- first OTP implementation uses AWS SNS
- add a fake or log-only OTP implementation for local/dev
- create an `AppointmentNotificationService` for confirmation/reminder delivery
- first appointment reminder implementation uses Amazon SES for email delivery
- create a dedicated appointment email template renderer
- reuse the receipt branding and visual structure as the base style, but render appointment-specific content
- send two appointment emails in v1:
  - booking confirmation when appointment is created
  - reminder email before the appointment

Implementation note:

- current receipt flow stores receipt data as JSON and does not yet have an email HTML template to reuse directly
- for appointments, we should introduce a real HTML template service and keep its branding aligned with receipts

## Backend Implementation Order

## Phase 1: Schema and core domain
- add Flyway migration for customer extension, loyalty tables, voucher tables, OTP tables, and appointment enhancements
- add new JPA entities and repositories
- add typed enums for loyalty entry type, voucher status, booking channel, cancellation actor

## Phase 2: Customer and loyalty services
- create customer search/create/update service
- create loyalty service for earning, redeeming, reversing, and manual adjustments
- hook loyalty earning into `TransactionService`
- hook loyalty reversal into `RefundService`

## Phase 3: Voucher admin and redemption
- build voucher catalog CRUD for IT admin
- build customer voucher redemption logic
- validate sufficient points before redemption

## Phase 4: Customer auth
- implement OTP issue/verify flow
- add customer JWT handling and security rules
- add rate limit checks

## Phase 5: Appointment expansion
- enhance appointment creation to support:
  - existing customer booking
  - logged-in customer self-booking
  - guest booking
- add cancellation rules
- add staff availability checks
- expose internal and public/customer appointment endpoints

## Phase 6: Internal frontend appointment updates
The customer-facing frontend is separate, but the current internal frontend should still be upgraded for appointment ops.

Internal frontend changes:

- add customer search and select when booking from POS
- allow guest name/phone capture
- display customer name/phone in the schedule table
- add cancel action and reason
- show booking channel and reference
- optionally show conflict warnings

## Phase 7: Internal admin frontend updates
Recommended admin UI work in current frontend:

- add new nav item for `Loyalty & Vouchers` under management
- manage earn percentage and loyalty flags
- manage voucher catalog
- view customer profile, points balance, and history

## Concrete Code Touchpoints

Backend files likely to change:

- `backend/src/main/resources/db/migration/*`
- `backend/src/main/java/com/salonpos/domain/*`
- `backend/src/main/java/com/salonpos/repository/*`
- `backend/src/main/java/com/salonpos/service/TransactionService.java`
- `backend/src/main/java/com/salonpos/service/RefundService.java`
- `backend/src/main/java/com/salonpos/service/AppointmentService.java`
- `backend/src/main/java/com/salonpos/config/SecurityConfig.java`
- `backend/src/main/java/com/salonpos/security/JwtService.java`
- `backend/src/main/java/com/salonpos/ratelimit/RateLimitFilter.java`
- `backend/src/main/java/com/salonpos/ratelimit/RateLimitPolicyNames.java`

Internal frontend files likely to change:

- `frontend/src/pages/AppointmentsPage.tsx`
- `frontend/src/pages/SettingsPage.tsx` or a new loyalty page
- `frontend/src/layouts/AppShell.tsx`
- `frontend/src/lib/api.ts`
- `frontend/src/lib/types.ts`

## Testing Plan

## Backend tests
- migration boot test
- customer create/update/search tests
- loyalty earn tests
- loyalty redeem tests
- refund reversal tests
- OTP request/verify tests
- appointment public booking tests
- appointment cancel tests
- overlap validation tests
- security tests for POS vs customer vs public endpoints

## Frontend tests
- appointment page flow for customer and guest booking
- voucher admin forms
- loyalty settings form validation

## Enhancements Worth Adding

These are not strictly required for v1, but they will pay off quickly.

### High-value enhancements
- phone normalization to E.164 from day one
- separate `customer_note` and `internal_note`
- appointment overlap validation by staff and branch
- booking reference for safer guest flows
- audit logs for loyalty adjustments, voucher changes, and customer auth events
- appointment confirmation and reminder emails via Amazon SES
- birthday reward or birthday voucher automation
- branch-scoped vouchers if promos differ by branch

### Nice follow-ups
- points expiry scheduler
- waitlist for fully booked slots
- customer tags such as `VIP`, `Frequent`, `No-show risk`
- appointment reminder status tracking
- customer merge flow for duplicate phone records

## Confirmed Decisions

1. Points are integer-only. Decimal remainders are discarded and never rounded.
2. Loyalty is global across all branches.
3. Voucher redemption creates reusable customer-owned vouchers.
4. Guest bookings should auto-create a customer record later after OTP verification.
5. Appointment confirmations and reminders should use email via Amazon SES in v1.
6. Customer profile should support `favorite_staff_id` and `secondary_favorite_staff_id`.

## Recommended Delivery Sequence

If we want to reduce risk and keep progress visible:

1. customer profile extension + internal customer CRUD/search
2. loyalty earning ledger integrated into transaction and refund flow
3. voucher catalog + redemption
4. customer OTP auth backend
5. appointment guest/customer API expansion
6. internal appointment page upgrade
7. separate customer frontend project after backend contracts stabilize

## Recommendation
The cleanest path is:

- extend the existing `customers` model instead of replacing it
- use a proper loyalty ledger, not only a balance column
- split voucher catalog from customer-owned vouchers
- create a fully separate customer auth/API namespace
- treat guest appointments as first-class records with booking reference and OTP-secured cancellation

That gives you a backend that can support both the internal POS flow and the future customer app without painting the system into a corner.
