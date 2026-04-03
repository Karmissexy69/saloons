UPDATE roles
SET name = 'TERMINAL'
WHERE name = 'ATTENDANCE_TERMINAL'
  AND NOT EXISTS (SELECT 1 FROM roles WHERE name = 'TERMINAL');

INSERT INTO roles(name)
SELECT 'TERMINAL'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'TERMINAL');

UPDATE app_users
SET username = 'terminal'
WHERE username = 'attendance'
  AND NOT EXISTS (SELECT 1 FROM app_users WHERE username = 'terminal');

UPDATE app_users
SET username = 'terminal'
WHERE username = 'attendance_terminal'
  AND NOT EXISTS (SELECT 1 FROM app_users WHERE username = 'terminal');

INSERT INTO app_users(username, password_hash, role_id, status)
SELECT 'terminal', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiBv8nQnUnxE27XGr0CcsMEY0S8mV5.', r.id, 'ACTIVE'
FROM roles r
WHERE r.name = 'TERMINAL'
  AND NOT EXISTS (SELECT 1 FROM app_users WHERE username = 'terminal');

UPDATE app_users u
SET role_id = r.id,
    status = CASE
        WHEN u.username = 'terminal' THEN 'ACTIVE'
        ELSE 'INACTIVE'
    END
FROM roles r
WHERE r.name = 'TERMINAL'
  AND (
      u.username IN ('terminal', 'attendance', 'attendance_terminal', 'admin', 'manager', 'cashier', 'stylist')
      OR u.role_id IN (
          SELECT id
          FROM roles
          WHERE name IN ('ADMIN', 'MANAGER', 'CASHIER', 'STYLIST', 'ATTENDANCE_TERMINAL')
      )
  );

DELETE FROM roles
WHERE name IN ('ADMIN', 'MANAGER', 'CASHIER', 'STYLIST', 'ATTENDANCE_TERMINAL');
