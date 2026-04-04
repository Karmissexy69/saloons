ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS favorite_staff_id BIGINT REFERENCES staff_profiles(id),
    ADD COLUMN IF NOT EXISTS secondary_favorite_staff_id BIGINT REFERENCES staff_profiles(id),
    ADD COLUMN IF NOT EXISTS points_balance INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_spend NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_visits INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_visit_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS phone_normalized VARCHAR(40),
    ADD COLUMN IF NOT EXISTS status VARCHAR(40) NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE customers
SET phone_normalized = REGEXP_REPLACE(TRIM(phone), '[^0-9+]', '', 'g')
WHERE phone_normalized IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_phone_normalized ON customers(phone_normalized);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

CREATE TABLE IF NOT EXISTS voucher_catalog (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(80) NOT NULL UNIQUE,
    name VARCHAR(180) NOT NULL,
    description TEXT,
    voucher_type VARCHAR(40) NOT NULL,
    discount_value NUMERIC(12,2) NOT NULL DEFAULT 0,
    points_cost INT NOT NULL,
    min_spend NUMERIC(12,2),
    branch_id BIGINT REFERENCES branches(id),
    service_id BIGINT REFERENCES services(id),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    valid_from TIMESTAMPTZ,
    valid_to TIMESTAMPTZ,
    daily_redemption_limit INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voucher_catalog_active ON voucher_catalog(active);

CREATE TABLE IF NOT EXISTS customer_vouchers (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id),
    voucher_catalog_id BIGINT NOT NULL REFERENCES voucher_catalog(id),
    status VARCHAR(40) NOT NULL,
    used_transaction_id BIGINT REFERENCES transactions(id),
    expires_at TIMESTAMPTZ,
    redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_vouchers_customer_status ON customer_vouchers(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_customer_vouchers_catalog ON customer_vouchers(voucher_catalog_id);

ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS customer_voucher_id BIGINT REFERENCES customer_vouchers(id),
    ADD COLUMN IF NOT EXISTS applied_voucher_discount NUMERIC(12,2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS loyalty_points_transactions (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id),
    transaction_id BIGINT REFERENCES transactions(id),
    refund_id BIGINT REFERENCES refunds(id),
    customer_voucher_id BIGINT REFERENCES customer_vouchers(id),
    appointment_id BIGINT REFERENCES appointments(id),
    entry_type VARCHAR(40) NOT NULL,
    points_delta INT NOT NULL,
    balance_after INT NOT NULL,
    remarks TEXT,
    actor_user_id BIGINT REFERENCES app_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_points_customer_created ON loyalty_points_transactions(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_transaction ON loyalty_points_transactions(transaction_id);

CREATE TABLE IF NOT EXISTS customer_otp_challenges (
    id BIGSERIAL PRIMARY KEY,
    phone VARCHAR(40) NOT NULL,
    phone_normalized VARCHAR(40) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    purpose VARCHAR(40) NOT NULL,
    reference_value VARCHAR(120),
    expires_at TIMESTAMPTZ NOT NULL,
    attempt_count INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 5,
    consumed_at TIMESTAMPTZ,
    channel VARCHAR(20) NOT NULL DEFAULT 'SMS',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_otp_lookup ON customer_otp_challenges(phone_normalized, purpose, created_at DESC);

CREATE TABLE IF NOT EXISTS customer_sessions (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id),
    refresh_token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    device_label VARCHAR(120),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_sessions_customer ON customer_sessions(customer_id, created_at DESC);

ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS guest_name VARCHAR(160),
    ADD COLUMN IF NOT EXISTS guest_phone VARCHAR(40),
    ADD COLUMN IF NOT EXISTS guest_phone_normalized VARCHAR(40),
    ADD COLUMN IF NOT EXISTS guest_email VARCHAR(180),
    ADD COLUMN IF NOT EXISTS booking_channel VARCHAR(40) NOT NULL DEFAULT 'POS',
    ADD COLUMN IF NOT EXISTS booking_reference VARCHAR(50),
    ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancelled_by_type VARCHAR(40),
    ADD COLUMN IF NOT EXISTS cancelled_by_id BIGINT,
    ADD COLUMN IF NOT EXISTS customer_note TEXT,
    ADD COLUMN IF NOT EXISTS created_by_customer_id BIGINT REFERENCES customers(id),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS confirmation_email_sent_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS reminder_email_sent_at TIMESTAMPTZ;

UPDATE appointments
SET booking_reference = 'APT-' || LPAD(id::TEXT, 8, '0')
WHERE booking_reference IS NULL;

UPDATE appointments
SET end_at = start_at + INTERVAL '1 hour'
WHERE end_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_appointments_booking_reference ON appointments(booking_reference);
CREATE INDEX IF NOT EXISTS idx_appointments_booking_channel ON appointments(booking_channel);
CREATE INDEX IF NOT EXISTS idx_appointments_guest_phone_normalized ON appointments(guest_phone_normalized);

INSERT INTO app_settings(setting_key, setting_value, created_at, updated_at)
VALUES
    ('loyalty.pointsEarnPercent', '10', NOW(), NOW()),
    ('loyalty.pointsEnabled', 'true', NOW(), NOW()),
    ('loyalty.pointsRoundingMode', 'TRUNCATE', NOW(), NOW()),
    ('loyalty.voucherRedemptionEnabled', 'true', NOW(), NOW()),
    ('loyalty.scope', 'GLOBAL', NOW(), NOW()),
    ('appointments.reminderLeadHours', '24', NOW(), NOW())
ON CONFLICT (setting_key) DO NOTHING;
