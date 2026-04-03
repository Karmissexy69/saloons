ALTER TABLE branches
    ADD COLUMN IF NOT EXISTS address TEXT;

CREATE TABLE IF NOT EXISTS app_settings (
    setting_key VARCHAR(160) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO app_settings(setting_key, setting_value, created_at, updated_at)
VALUES ('receipt.businessName', 'BrowPOS', NOW(), NOW())
ON CONFLICT (setting_key) DO NOTHING;
