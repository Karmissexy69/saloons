ALTER TABLE services
    ADD COLUMN commission_type VARCHAR(20) NOT NULL DEFAULT 'PERCENTAGE',
    ADD COLUMN commission_value NUMERIC(12,2) NOT NULL DEFAULT 0.00;

CREATE TABLE staff_profiles (
    id BIGSERIAL PRIMARY KEY,
    display_name VARCHAR(160) NOT NULL,
    role_type VARCHAR(60) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE attendance_logs (
    id BIGSERIAL PRIMARY KEY,
    staff_id BIGINT NOT NULL REFERENCES staff_profiles(id),
    branch_id BIGINT NOT NULL,
    clock_in_at TIMESTAMPTZ NOT NULL,
    clock_out_at TIMESTAMPTZ,
    current_break_start_at TIMESTAMPTZ,
    break_minutes INT NOT NULL DEFAULT 0,
    attendance_status VARCHAR(40) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE commission_entries (
    id BIGSERIAL PRIMARY KEY,
    transaction_line_id BIGINT NOT NULL REFERENCES transaction_lines(id) ON DELETE CASCADE,
    staff_id BIGINT NOT NULL REFERENCES staff_profiles(id),
    commission_amount NUMERIC(12,2) NOT NULL,
    status VARCHAR(40) NOT NULL,
    calculated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE refunds (
    id BIGSERIAL PRIMARY KEY,
    transaction_id BIGINT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    approved_by BIGINT NOT NULL,
    reason TEXT NOT NULL,
    total_refund NUMERIC(12,2) NOT NULL,
    refunded_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_attendance_staff_open ON attendance_logs(staff_id, clock_out_at);
CREATE INDEX idx_commission_staff_calculated ON commission_entries(staff_id, calculated_at);
CREATE INDEX idx_refunds_refunded_at ON refunds(refunded_at);
CREATE INDEX idx_refunds_txn ON refunds(transaction_id);

INSERT INTO staff_profiles(display_name, role_type, active) VALUES
('Aina', 'STYLIST', TRUE),
('Ravi', 'STYLIST', TRUE),
('Mia', 'CASHIER', TRUE),
('Nora', 'MANAGER', TRUE);
