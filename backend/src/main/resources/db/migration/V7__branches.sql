CREATE TABLE branches (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(160) NOT NULL UNIQUE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO branches(id, name, active, created_at)
VALUES (1, 'Downtown Branch', TRUE, NOW())
ON CONFLICT (id) DO NOTHING;

WITH existing_branch_ids AS (
    SELECT branch_id AS id FROM transactions
    UNION
    SELECT branch_id AS id FROM attendance_logs
    UNION
    SELECT branch_id AS id FROM appointments
)
INSERT INTO branches(id, name, active, created_at)
SELECT
    id,
    CASE
        WHEN id = 1 THEN 'Downtown Branch'
        ELSE 'Branch ' || id
    END,
    TRUE,
    NOW()
FROM existing_branch_ids
WHERE id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM branches b
      WHERE b.id = existing_branch_ids.id
  );

SELECT setval(
    pg_get_serial_sequence('branches', 'id'),
    COALESCE((SELECT MAX(id) FROM branches), 1),
    TRUE
);

ALTER TABLE transactions
    ADD CONSTRAINT fk_transactions_branch
    FOREIGN KEY (branch_id) REFERENCES branches(id);

ALTER TABLE attendance_logs
    ADD CONSTRAINT fk_attendance_logs_branch
    FOREIGN KEY (branch_id) REFERENCES branches(id);

ALTER TABLE appointments
    ADD CONSTRAINT fk_appointments_branch
    FOREIGN KEY (branch_id) REFERENCES branches(id);

CREATE INDEX idx_attendance_branch ON attendance_logs(branch_id);
CREATE INDEX idx_appointments_branch ON appointments(branch_id);
