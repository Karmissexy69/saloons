ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS receipt VARCHAR(80);

UPDATE appointments a
SET receipt = t.receipt_no,
    status = 'COMPLETED',
    updated_at = CURRENT_TIMESTAMP
FROM transactions t
WHERE a.converted_transaction_id = t.id
  AND (a.receipt IS NULL OR a.receipt = '');

CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_receipt_unique
    ON appointments (receipt)
    WHERE receipt IS NOT NULL;
