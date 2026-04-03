ALTER TABLE app_users
    ADD COLUMN staff_profile_id BIGINT REFERENCES staff_profiles(id);

CREATE UNIQUE INDEX uq_app_users_staff_profile_id
    ON app_users(staff_profile_id)
    WHERE staff_profile_id IS NOT NULL;

INSERT INTO roles(name)
SELECT 'IT_ADMIN'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'IT_ADMIN');

INSERT INTO app_users(username, password_hash, role_id, status)
SELECT 'itadmin', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiBv8nQnUnxE27XGr0CcsMEY0S8mV5.', r.id, 'ACTIVE'
FROM roles r
WHERE r.name = 'IT_ADMIN'
  AND NOT EXISTS (SELECT 1 FROM app_users WHERE username = 'itadmin');

UPDATE app_users
SET staff_profile_id = (
    SELECT id FROM staff_profiles WHERE role_type = 'MANAGER' ORDER BY id LIMIT 1
)
WHERE username = 'manager' AND staff_profile_id IS NULL;

UPDATE app_users
SET staff_profile_id = (
    SELECT id FROM staff_profiles WHERE role_type = 'CASHIER' ORDER BY id LIMIT 1
)
WHERE username = 'cashier' AND staff_profile_id IS NULL;

UPDATE app_users
SET staff_profile_id = (
    SELECT id FROM staff_profiles WHERE role_type = 'STYLIST' ORDER BY id LIMIT 1
)
WHERE username = 'stylist' AND staff_profile_id IS NULL;

CREATE TABLE staff_face_profiles (
    id BIGSERIAL PRIMARY KEY,
    staff_id BIGINT NOT NULL REFERENCES staff_profiles(id),
    rekognition_collection_id VARCHAR(255) NOT NULL,
    rekognition_face_id VARCHAR(255) NOT NULL,
    rekognition_external_image_id VARCHAR(255) NOT NULL,
    s3_enrollment_key VARCHAR(512) NOT NULL,
    quality_score NUMERIC(5,2),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_staff_face_profiles_face_id ON staff_face_profiles(rekognition_face_id);
CREATE INDEX idx_staff_face_profiles_staff_active ON staff_face_profiles(staff_id, is_active);
CREATE UNIQUE INDEX uq_staff_face_profiles_staff_active
    ON staff_face_profiles(staff_id)
    WHERE is_active = TRUE;

CREATE TABLE attendance_face_verifications (
    id BIGSERIAL PRIMARY KEY,
    staff_id BIGINT NOT NULL REFERENCES staff_profiles(id),
    attendance_id BIGINT REFERENCES attendance_logs(id),
    similarity NUMERIC(5,2),
    threshold NUMERIC(5,2) NOT NULL,
    match_result VARCHAR(20) NOT NULL,
    failure_reason VARCHAR(80),
    rekognition_request_id VARCHAR(120),
    s3_probe_image_key VARCHAR(512),
    verification_token_id UUID,
    token_expires_at TIMESTAMPTZ,
    token_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attendance_face_verifications_staff_created
    ON attendance_face_verifications(staff_id, created_at);
CREATE INDEX idx_attendance_face_verifications_probe_key
    ON attendance_face_verifications(s3_probe_image_key);
CREATE INDEX idx_attendance_face_verifications_token_id
    ON attendance_face_verifications(verification_token_id);
