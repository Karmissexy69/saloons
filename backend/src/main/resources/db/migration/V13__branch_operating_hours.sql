ALTER TABLE branches
    ADD COLUMN IF NOT EXISTS opening_time TIME,
    ADD COLUMN IF NOT EXISTS closing_time TIME;

UPDATE branches
SET opening_time = COALESCE(opening_time, TIME '08:00:00'),
    closing_time = COALESCE(closing_time, TIME '20:00:00');

ALTER TABLE branches
    ALTER COLUMN opening_time SET NOT NULL,
    ALTER COLUMN opening_time SET DEFAULT TIME '08:00:00',
    ALTER COLUMN closing_time SET NOT NULL,
    ALTER COLUMN closing_time SET DEFAULT TIME '20:00:00';
