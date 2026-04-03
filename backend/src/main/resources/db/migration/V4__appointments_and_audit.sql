CREATE TABLE appointments (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT REFERENCES customers(id),
    staff_id BIGINT REFERENCES staff_profiles(id),
    branch_id BIGINT NOT NULL,
    service_id BIGINT REFERENCES services(id),
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ,
    status VARCHAR(40) NOT NULL,
    deposit_amount NUMERIC(12,2),
    notes TEXT,
    converted_transaction_id BIGINT REFERENCES transactions(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_appointments_start ON appointments(start_at);
CREATE INDEX idx_appointments_staff ON appointments(staff_id);
CREATE INDEX idx_appointments_status ON appointments(status);

CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    actor_user_id BIGINT REFERENCES app_users(id),
    entity_type VARCHAR(100) NOT NULL,
    entity_id BIGINT,
    action VARCHAR(120) NOT NULL,
    before_json TEXT,
    after_json TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
