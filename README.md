# Salon POS Backend

Spring Boot backend for the salon POS.
Current implementation focus is internal operations (checkout, attendance, commissions, refunds, reporting), with customer-centric expansion deferred.

## Implemented Scope

- JWT authentication and role-based access control
- Frontend Stitch-integrated app shell (`React + Vite + TypeScript + fetch`)
- Service catalog (list + create)
- Staff listing + staff creation + face enrollment
- Staff face re-enrollment (IT-only)
- POS transaction checkout
- E-receipt retrieval
- Receipt history filtering + CSV export
- Attendance flow (clock-in / break-start / break-end / clock-out)
- Biometric attendance verification (AWS Rekognition + S3)
- Commission generation and statements
- Refund processing with commission reversal
- Sales summary reporting
- Appointment creation/status flow/convert-to-bill
- Audit logging + audit log query API

## Deferred (Not Yet Implemented)

- Customer profile/history workflows
- Loyalty/memberships/prepaid packages
- Appointment calendar module

## Tech Stack

- Java 21
- Spring Boot 3.3.5
- PostgreSQL
- Flyway migrations
- Spring Security + JWT
- Springdoc OpenAPI (Swagger UI)
- AWS SDK v2 (`S3`, `Rekognition`)

## Local Run

1. Start database

```bash
docker compose up -d
```

2. Run backend

```bash
cd backend
./mvnw spring-boot:run
```

If Maven wrapper is unavailable:

```bash
cd backend
mvn spring-boot:run
```

Base URL: `http://localhost:8080`

3. Run frontend MVP (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Frontend URL: `http://localhost:5173`

## Swagger / OpenAPI

- Swagger UI: `http://localhost:8080/swagger-ui/index.html`
- OpenAPI JSON: `http://localhost:8080/v3/api-docs`

Use JWT in Swagger:
1. Call `POST /api/auth/login`
2. Copy `accessToken`
3. Click `Authorize`
4. Paste `Bearer <accessToken>`

## Frontend Apps (Webcam + Camera)

### 1) React Frontend MVP (primary)

- URL: `http://localhost:5173`
- Files under: `frontend/`
- API client uses browser `fetch` (no axios)

Setup:

```bash
cp frontend/.env.example frontend/.env.local
```

`frontend/.env.example`:

```bash
VITE_API_BASE_URL=http://localhost:8080
```

Flow:
1. Login with seeded user
2. Use the sidebar pages to run each API workflow
3. For attendance biometric flows, start camera and capture selfie (or use fallback upload)
4. Run verify-face then clock actions

Current frontend page map (path routes):
- `/dashboard`
- `/attendance-kiosk`
- `/attendance-logs`
- `/staff`
- `/services`
- `/appointments`
- `/pos-terminal`
- `/receipts`
- `/refunds`
- `/commission`
- `/sales`
- `/audit-logs`

Integrated API modules:
- Auth: `POST /api/auth/login`
- Services: `GET /api/services`, `POST /api/services`
- Staff: `GET /api/staff`, `POST /api/staff`, `POST /api/staff/{staffId}/face/re-enroll`
- Attendance: `GET /api/attendance/report`, `POST /api/attendance/verify-face`, `POST /api/attendance/clock-in`, `POST /api/attendance/break-start`, `POST /api/attendance/break-end`, `POST /api/attendance/clock-out`
- Transactions: `POST /api/transactions`
- Receipts: `GET /api/receipts/{receiptNo}`, `GET /api/receipts/history`, `GET /api/receipts/history/export`
- Refunds: `POST /api/refunds`
- Commission: `GET /api/commission/staff/{staffId}/statement`
- Reports: `GET /api/reports/sales-summary`
- Appointments: `POST /api/appointments`, `GET /api/appointments`, `PATCH /api/appointments/{id}/status`, `POST /api/appointments/{id}/convert-to-bill`
- Audit Logs: `GET /api/audit-logs`

Button behavior:
- Attendance verify is disabled until selfie + valid `staffId`
- Attendance clock-in is disabled until verification token + valid `staffId` + valid `branchId`
- Attendance clock-out is disabled until verification token + valid `staffId`
- Attendance break buttons are present but disabled for now (as requested)

### 2) Backend Static Minimal UI (legacy test page)

A minimal browser frontend is available from backend static files:

- URL: `http://localhost:8080/`
- Files:
  - `backend/src/main/resources/static/index.html`
  - `backend/src/main/resources/static/app.js`
  - `backend/src/main/resources/static/styles.css`

Flow:
1. Login with seeded user.
2. Enter `staffId` and `branchId`.
3. Click `Start Camera` (webcam).
4. Click `Capture`.
5. Click `Verify Face`.
6. Click `Clock In` or `Clock Out`.

Mobile fallback:
- Use `Fallback Upload` input (`capture=\"user\"`) to open device camera/file picker.

Camera requirements:
- Use `http://localhost` (or HTTPS origin) so `getUserMedia` is allowed.
- Grant browser camera permission when prompted.

## Design Docs

- Face verification attendance plan: `docs/attendance-rekognition-plan.md`
- Frontend MVP plan: `docs/frontend-mvp-plan.md`

## Configuration

`backend/src/main/resources/application.yml` supports env overrides:

```yaml
app:
  jwt:
    secret: ${APP_JWT_SECRET:change-this-secret-change-this-secret-2026}
    expiration-seconds: ${APP_JWT_EXPIRATION_SECONDS:3600}
  biometric:
    aws-region: ${APP_BIOMETRIC_AWS_REGION:ap-southeast-1}
    rekognition-collection-id: ${APP_BIOMETRIC_COLLECTION_ID:salonpos-staff-faces}
    s3-biometric-bucket: ${APP_BIOMETRIC_S3_BUCKET:salonpos-biometric-private}
    face-match-threshold: ${APP_BIOMETRIC_FACE_MATCH_THRESHOLD:80}
    verification-token-ttl-minutes: ${APP_BIOMETRIC_TOKEN_TTL_MINUTES:10}
    probe-purge-day-of-month: ${APP_BIOMETRIC_PROBE_PURGE_DAY_OF_MONTH:7}
```

### Local CORS (for frontend dev only)

- `SecurityConfig` now enables CORS via `CorsConfigurationSource`
- Local CORS file path: `backend/src/main/java/com/salonpos/config/CorsConfig.java`
- This file is intentionally `.gitignore`'d (local-only), so it will not be pushed
- Allowed origins are read from:
  - `APP_ALLOWED_ORIGINS` (comma-separated)
  - default: `http://localhost:5173,http://127.0.0.1:5173`

Production note:
- For server deployment, rely on Traefik policy and avoid committing local dev CORS file.

## Authentication

### Login

`POST /api/auth/login`

Request:

```json
{
  "username": "terminal",
  "password": "password"
}
```

Response:

```json
{
  "accessToken": "<jwt>",
  "tokenType": "Bearer",
  "expiresInSeconds": 3600,
  "username": "terminal",
  "role": "TERMINAL"
}
```

### Seeded Users

- `owner / password`
- `itadmin / password`
- `terminal / password`

### Shared Terminal User (Startup Bootstrap)

This user is created/updated at application startup (not via Flyway migration):

- role: `TERMINAL`
- username: from `APP_TERMINAL_USERNAME`
- password: from `APP_TERMINAL_PASSWORD`
- enabled toggle: `APP_TERMINAL_ENABLED` (default `true`)

Backward-compatible env fallbacks:
- `APP_ATTENDANCE_TERMINAL_USERNAME`
- `APP_ATTENDANCE_TERMINAL_PASSWORD`
- `APP_ATTENDANCE_TERMINAL_ENABLED`

If terminal password is blank, bootstrap is skipped and a warning is logged.

Use header:

`Authorization: Bearer <accessToken>`

## Data Migrations

- `V1__init_pos_core.sql`
- `V2__internal_ops_modules.sql`
- `V3__auth_rbac.sql`
- `V4__appointments_and_audit.sql`
- `V5__biometric_attendance.sql`
- `V6__terminal_role_consolidation.sql`

## API Reference

### 1) Services

#### `GET /api/services`
List active services.
Roles: `TERMINAL`, `IT_ADMIN`

#### `POST /api/services`
Create service.
Roles: `IT_ADMIN`

Request:

```json
{
  "categoryName": "Nails",
  "name": "Nail Art",
  "price": 17.00,
  "durationMinutes": 45,
  "commissionType": "PERCENTAGE",
  "commissionValue": 10,
  "active": true
}
```

Rules:
- Either `categoryId` or `categoryName` is required
- Duplicate service name in same category is rejected
- `commissionType` defaults to `PERCENTAGE`
- `commissionValue` defaults to `0`
- `active` defaults to `true`

### 2) Staff (Internal)

#### `GET /api/staff`
List staff profiles.
Roles: `TERMINAL`, `IT_ADMIN`

#### `POST /api/staff` (multipart/form-data)
Create staff and enroll face (required).
Roles: `IT_ADMIN`

Parts:
- `profile` (JSON)
- `enrollmentPhoto` (image file, required)

`profile` example:

```json
{
  "displayName": "Asha",
  "roleType": "STYLIST",
  "active": true
}
```

Response:

```json
{
  "id": 10,
  "displayName": "Asha",
  "roleType": "STYLIST",
  "active": true,
  "faceEnrolled": true
}
```

#### `POST /api/staff/{staffId}/face/re-enroll` (multipart/form-data)
Re-enroll staff face profile.
Roles: `IT_ADMIN`

Parts:
- `enrollmentPhoto` (image file, required)

Response:

```json
{
  "staffId": 10,
  "faceProfileId": 15,
  "message": "Face re-enrollment completed"
}
```

### 3) POS Transactions

#### `POST /api/transactions`
Creates transaction + lines + payments + receipt + commission entries.
Roles: `TERMINAL`, `IT_ADMIN`

Request:

```json
{
  "branchId": 1,
  "cashierId": 3,
  "discountTotal": 5.00,
  "lines": [
    {"serviceId": 1, "qty": 1, "discountAmount": 0, "assignedStaffId": 1},
    {"serviceId": 3, "qty": 1, "discountAmount": 0, "assignedStaffId": 2}
  ],
  "payments": [
    {"method": "CARD", "amount": 183.00, "referenceNo": "TXN-12345"}
  ]
}
```

Validation:
- Service IDs must exist
- Payment total must equal final bill total
- Total cannot be negative

### 4) Receipts

#### `GET /api/receipts/{receiptNo}`
Fetch stored receipt payload and status.
Roles: `TERMINAL`, `IT_ADMIN`

#### `GET /api/receipts/history`
Filterable receipt history with pagination.
Roles: `TERMINAL`, `IT_ADMIN`

Query params:
- `receiptNo` (optional, partial)
- `branchId` (optional)
- `cashierId` (optional)
- `status` (optional: `PAID`, `REFUNDED`, `VOIDED`)
- `from` (optional, `YYYY-MM-DD`)
- `to` (optional, `YYYY-MM-DD`)
- `page` (default `0`)
- `size` (default `20`)

#### `GET /api/receipts/history/export`
Export filtered receipt history as CSV.
Roles: `TERMINAL`, `IT_ADMIN`

### 5) Attendance

#### `GET /api/attendance/report`
Attendance report with filters + pagination.
Roles: `OWNER`, `IT_ADMIN`

Query params:
- `staffId` (optional)
- `branchId` (optional)
- `from` (optional, `YYYY-MM-DD`)
- `to` (optional, `YYYY-MM-DD`)
- `page` (default `0`)
- `size` (default `20`)

#### `POST /api/attendance/verify-face` (multipart/form-data)
Step 1 of clock-in: verify selfie and return short-lived token when pass.
Roles: `TERMINAL`, `IT_ADMIN`

Fields:
- `staffId` (request param)
- `selfie` (image file)

Success response example:

```json
{
  "verified": true,
  "failureReason": null,
  "threshold": 80.00,
  "similarity": 93.42,
  "verificationToken": "<token>",
  "verificationId": 42
}
```

Failure reason examples:
- `NO_FACE_DETECTED`
- `MULTIPLE_FACES_DETECTED`
- `LOW_SIMILARITY`
- `STAFF_FACE_PROFILE_NOT_FOUND`
- `MATCHED_OTHER_STAFF`
- `AWS_REKOGNITION_UNAVAILABLE`

#### `POST /api/attendance/clock-in`
Step 2 of clock-in: consume token from `verify-face`.

```json
{
  "staffId": 1,
  "branchId": 1,
  "verificationToken": "<token-from-verify-face>"
}
```

#### `POST /api/attendance/break-start`

```json
{
  "staffId": 1
}
```

#### `POST /api/attendance/break-end`

```json
{
  "staffId": 1
}
```

#### `POST /api/attendance/clock-out`

```json
{
  "staffId": 1,
  "verificationToken": "<token-from-verify-face>"
}
```

Behavior:
- Prevents duplicate open clock-in
- Tracks break minutes
- Auto-closes active break on clock-out
- For `TERMINAL`, attendance actions can be done for any `staffId`
- For non-terminal roles, self-service rule is enforced (`staffId` must match authenticated user’s linked staff profile)
- Clock-out uses the same verification token pattern as clock-in
- Face match threshold default is `80`

### 6) Refunds

#### `POST /api/refunds`
Refund by `transactionId` or `receiptNo`.
Roles: `IT_ADMIN`

Request:

```json
{
  "receiptNo": "B1-20260401-1234",
  "approvedBy": 4,
  "reason": "Service quality complaint",
  "totalRefund": 50.00
}
```

Behavior:
- Only paid transactions can be refunded
- Supports partial and full refund
- Creates commission reversal entries proportionally
- Marks transaction `REFUNDED` when fully refunded

### 7) Commission

#### `GET /api/commission/staff/{staffId}/statement?from=2026-04-01&to=2026-04-30`
Returns:
- `earned`
- `reversal`
- `net`

Roles: `OWNER`, `IT_ADMIN`

### 8) Reports

#### `GET /api/reports/sales-summary?from=2026-04-01&to=2026-04-30`
Optional `branchId` filter.

Returns:
- `grossSales`
- `netSales`
- `discountTotal`
- `refundTotal`
- `averageBill`
- `transactionCount`

Roles: `OWNER`, `IT_ADMIN`

### 9) Appointments

#### `POST /api/appointments`
Create appointment.
Roles: `TERMINAL`, `IT_ADMIN`

```json
{
  "staffId": 1,
  "branchId": 1,
  "serviceId": 2,
  "startAt": "2026-04-01T10:00:00Z",
  "endAt": "2026-04-01T10:45:00Z",
  "status": "BOOKED",
  "depositAmount": 20.00,
  "notes": "Prefers short style"
}
```

#### `GET /api/appointments`
List by `status`, or by `from` + `to` (optional `branchId`).
Roles: `TERMINAL`, `IT_ADMIN`

#### `PATCH /api/appointments/{id}/status`
Update status (`BOOKED`, `CHECKED_IN`, `IN_SERVICE`, `COMPLETED`, `CANCELLED`, `NO_SHOW`).
Roles: `TERMINAL`, `IT_ADMIN`

#### `POST /api/appointments/{id}/convert-to-bill`
Convert appointment to POS transaction.
Roles: `TERMINAL`, `IT_ADMIN`

```json
{
  "cashierId": 3,
  "discountTotal": 0,
  "payments": [
    {"method": "CARD", "amount": 45.00, "referenceNo": "APPT-PAY-001"}
  ]
}
```

### 10) Audit Logs

#### `GET /api/audit-logs`
Review audit trail with pagination.
Roles: `OWNER`, `IT_ADMIN`

Query params:
- `entityType` (optional)
- `action` (optional, partial)
- `from` (optional, `YYYY-MM-DD`)
- `to` (optional, `YYYY-MM-DD`)
- `page` (default `0`)
- `size` (default `50`)

## Biometric Retention Policy

- Enrollment image: retained until re-enrollment/offboarding policy cleanup
- Probe/selfie images: previous months are purged on day `7` of current month
- Example: March probe images are purged on April 7; April 1-7 remain until May 7

## Notes

- Security is JWT-protected and role-scoped at route level.
- Sensitive internal actions are audited.
- Customer profile APIs are intentionally postponed for later phase.
# saloons
