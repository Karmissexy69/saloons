CREATE TABLE roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(60) NOT NULL UNIQUE
);

CREATE TABLE app_users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_id BIGINT NOT NULL REFERENCES roles(id),
    status VARCHAR(40) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_app_users_role ON app_users(role_id);

INSERT INTO roles(name) VALUES
('OWNER'),
('ADMIN'),
('MANAGER'),
('CASHIER'),
('STYLIST');

-- All seeded users use password: password
INSERT INTO app_users(username, password_hash, role_id, status) VALUES
('owner', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiBv8nQnUnxE27XGr0CcsMEY0S8mV5.', 1, 'ACTIVE'),
('admin', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiBv8nQnUnxE27XGr0CcsMEY0S8mV5.', 2, 'ACTIVE'),
('manager', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiBv8nQnUnxE27XGr0CcsMEY0S8mV5.', 3, 'ACTIVE'),
('cashier', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiBv8nQnUnxE27XGr0CcsMEY0S8mV5.', 4, 'ACTIVE'),
('stylist', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiBv8nQnUnxE27XGr0CcsMEY0S8mV5.', 5, 'ACTIVE');
