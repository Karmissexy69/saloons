ALTER TABLE customers
    ALTER COLUMN phone DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_email_lookup
    ON customers (LOWER(email))
    WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_guest_email_lookup
    ON appointments (LOWER(guest_email))
    WHERE guest_email IS NOT NULL;

ALTER TABLE customer_otp_challenges
    ALTER COLUMN phone DROP NOT NULL,
    ALTER COLUMN phone_normalized DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS email VARCHAR(180),
    ADD COLUMN IF NOT EXISTS email_normalized VARCHAR(180);

ALTER TABLE customer_otp_challenges
    ALTER COLUMN channel SET DEFAULT 'EMAIL';

CREATE INDEX IF NOT EXISTS idx_customer_otp_email_lookup
    ON customer_otp_challenges(email_normalized, purpose, created_at DESC);
