ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS proof_image_key VARCHAR(512);
