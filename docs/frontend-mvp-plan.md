# Frontend MVP Plan (Minimal UI, Full API Integration)

## Objective
Build a minimal frontend to validate critical business flows quickly, with clean API integration and low implementation risk.

Primary goal now:
- Prove backend flows end-to-end (especially biometric attendance) before investing in polished UI.

## Recommended Stack

- React + Vite + TypeScript
- React Router
- TanStack Query (API state/cache/retries)
- `fetch` or Axios for HTTP client
- Simple CSS (no heavy design system yet)

Reasoning:
- Fast setup, strong typing, easy to iterate.
- Query caching + invalidation reduces API complexity.

## MVP Modules (In Priority Order)

1. Auth (login + token handling)
2. Landing dashboard with `Clock In` entry point
3. Biometric attendance flow (`verify-face` -> `clock-in`)
4. Attendance actions (`break-start`, `break-end`, `clock-out`)
5. Staff management (list + create + face re-enroll)
6. Services (list + create)
7. Basic transaction create + receipt lookup/history

## Proposed Frontend Flow

### 1) Login
- Page: `Login`
- API: `POST /api/auth/login`
- Save `accessToken`, `username`, `role` in in-memory state + localStorage.
- Redirect to `Dashboard`.

### 2) Dashboard (Minimal)
- Show user identity and role.
- Primary button: `Clock In`.
- Secondary quick links:
  - Attendance actions
  - Staff
  - Services
  - POS Checkout
  - Receipts

### 3) Clock-In (Biometric, Option B)

Step A: Verify face
- Screen captures selfie (file input for MVP; camera integration optional).
- API: `POST /api/attendance/verify-face` (multipart)
  - `staffId` as query param
  - `selfie` file
- If fail: show backend `failureReason` and allow retry.

Step B: Clock in
- If verified, immediately call:
  - `POST /api/attendance/clock-in`
  - body: `{ staffId, branchId, verificationToken }`
- Show success state (`clockInAt`, status).

Important constraint:
- Backend enforces self clock-in (`staffId` must match authenticated user’s linked staff profile).

### 4) Attendance Actions
- Buttons:
  - Break Start -> `POST /api/attendance/break-start`
  - Break End -> `POST /api/attendance/break-end`
  - Clock Out -> `POST /api/attendance/clock-out`
- Body uses `staffId`.
- Show latest response in simple activity panel.

### 5) Staff Module (Admin/IT)

Staff list:
- API: `GET /api/staff`

Create staff:
- API: `POST /api/staff` (multipart)
  - `profile` JSON
  - `enrollmentPhoto` file

Face re-enroll (IT_ADMIN):
- API: `POST /api/staff/{staffId}/face/re-enroll` (multipart)
  - `enrollmentPhoto` file

### 6) Services Module
- List: `GET /api/services`
- Create: `POST /api/services`

### 7) POS + Receipts (Basic)
- Create transaction: `POST /api/transactions`
- Receipt fetch: `GET /api/receipts/{receiptNo}`
- Receipt history: `GET /api/receipts/history`

## Role-Based Frontend Guarding

UI should hide/disable routes by role to reduce user confusion:

- `IT_ADMIN`:
  - Can access face re-enrollment tools.
- `OWNER`, `ADMIN`:
  - Can create staff.
- `CASHIER`, `STYLIST`, `MANAGER`:
  - Can access attendance flow.

Note:
- Backend remains source of truth for authorization.

## API Integration Design

## HTTP Client Layer
- `apiClient` with:
  - Base URL (`VITE_API_BASE_URL`)
  - `Authorization: Bearer <token>`
  - centralized error parser (`error`, `fields`)

## Query/Mutation Layer
- `authApi.ts`
- `attendanceApi.ts`
- `staffApi.ts`
- `servicesApi.ts`
- `transactionsApi.ts`
- `receiptsApi.ts`

Each module exports typed request/response functions.

## Optimizations (MVP-Safe)

1. Request deduplication and caching
- Use TanStack Query for list endpoints (`staff`, `services`, `receipt history`).

2. Optimistic UX where safe
- For attendance action buttons, disable during in-flight request and show immediate feedback.

3. Retry policy
- Retry only idempotent GETs.
- Do not auto-retry POSTs that change state.

4. Multipart upload handling
- Enforce image type and 5MB max before request.
- Client-side preview to reduce bad submissions.

5. Error mapping
- Show specific biometric failure reasons from backend.
- Show validation field errors from `fields` object.

6. Bundle/perf
- Route-level lazy loading after auth.
- Keep initial dashboard payload minimal.

## Minimal UI Structure

- `/login`
- `/dashboard`
- `/attendance/clock-in`
- `/attendance/actions`
- `/staff`
- `/services`
- `/pos/checkout`
- `/receipts`

Keep layout simple:
- Top nav + content panel
- Basic form cards and table lists
- No complex design system yet

## State Model

- Auth state:
  - `token`, `username`, `role`
- Session state:
  - `linkedStaffId` (derived by one-time lookup if needed)
- Query state via TanStack Query cache

## Validation Strategy

Frontend validation:
- Required fields, numeric bounds, file type/size

Backend validation:
- Remains authoritative for role, staff ownership, threshold logic, token validity

## Test Plan (MVP)

1. Login success/failure
2. Verify-face fail reasons surface correctly
3. Verify-face success + immediate clock-in
4. Token reuse should fail
5. Self clock-in mismatch should fail
6. Staff create fails without enrollment photo
7. IT re-enroll restricted by role
8. Services and receipts basic CRUD/read paths

## Implementation Phases

Phase 1 (core demo):
- Auth + Dashboard + Biometric Clock-In flow

Phase 2 (ops tools):
- Attendance actions + Staff list/create/re-enroll

Phase 3 (transactional):
- Services + POS checkout + receipts/history

## Risks and Mitigations

Risk:
- Staff-to-user mapping may not exist for all users.
Mitigation:
- Add a small “staff selector for test mode” behind admin flag during early testing.

Risk:
- Camera behavior differs by browser/device.
Mitigation:
- Start with file upload fallback; add webcam capture after core flow proves stable.

Risk:
- AWS credential/config mistakes cause biometric failures.
Mitigation:
- Add frontend health/status banner when verify-face returns service-unavailable reason.

## Definition of Done (MVP)

- A user can log in, click `Clock In`, upload selfie, pass verification, and clock in successfully.
- Admin/IT can create a staff member with required enrollment photo.
- IT can re-enroll staff face.
- README + setup docs are enough for another developer to run and test flows quickly.
