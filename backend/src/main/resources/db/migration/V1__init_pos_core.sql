CREATE TABLE service_categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE,
    sort_order INT NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE services (
    id BIGSERIAL PRIMARY KEY,
    category_id BIGINT NOT NULL REFERENCES service_categories(id),
    name VARCHAR(180) NOT NULL,
    price NUMERIC(12,2) NOT NULL,
    duration_minutes INT,
    active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE customers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    phone VARCHAR(40) NOT NULL UNIQUE,
    email VARCHAR(180),
    birthday DATE,
    notes TEXT
);

CREATE TABLE transactions (
    id BIGSERIAL PRIMARY KEY,
    receipt_no VARCHAR(60) NOT NULL UNIQUE,
    branch_id BIGINT NOT NULL,
    customer_id BIGINT REFERENCES customers(id),
    cashier_id BIGINT NOT NULL,
    status VARCHAR(30) NOT NULL,
    subtotal NUMERIC(12,2) NOT NULL,
    discount_total NUMERIC(12,2) NOT NULL,
    total NUMERIC(12,2) NOT NULL,
    sold_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE transaction_lines (
    id BIGSERIAL PRIMARY KEY,
    transaction_id BIGINT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    service_id BIGINT NOT NULL REFERENCES services(id),
    qty INT NOT NULL,
    unit_price NUMERIC(12,2) NOT NULL,
    discount_amount NUMERIC(12,2) NOT NULL,
    assigned_staff_id BIGINT
);

CREATE TABLE payments (
    id BIGSERIAL PRIMARY KEY,
    transaction_id BIGINT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    method VARCHAR(30) NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    reference_no VARCHAR(120)
);

CREATE TABLE receipts (
    id BIGSERIAL PRIMARY KEY,
    transaction_id BIGINT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    receipt_no VARCHAR(60) NOT NULL UNIQUE,
    receipt_json TEXT NOT NULL,
    sent_status VARCHAR(40) NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_services_category ON services(category_id);
CREATE INDEX idx_transactions_sold_at ON transactions(sold_at);
CREATE INDEX idx_transactions_branch ON transactions(branch_id);
CREATE INDEX idx_transaction_lines_txn ON transaction_lines(transaction_id);
CREATE INDEX idx_payments_txn ON payments(transaction_id);

INSERT INTO service_categories(name, sort_order, active) VALUES
('Haircut', 1, TRUE),
('Wash', 2, TRUE),
('Colour', 3, TRUE),
('Treatment', 4, TRUE);

INSERT INTO services(category_id, name, price, duration_minutes, active) VALUES
(1, 'Women Haircut', 68.00, 45, TRUE),
(1, 'Men Haircut', 45.00, 30, TRUE),
(2, 'Basic Wash + Blow', 35.00, 25, TRUE),
(3, 'Root Touch Up', 120.00, 90, TRUE),
(4, 'Keratin Express', 180.00, 120, TRUE);
