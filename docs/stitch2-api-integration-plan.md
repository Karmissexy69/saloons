# Stitch 2 API Integration Plan

## Goal
Use the uploaded `frontend/stitch 2` designs as the visual source of truth, then integrate them with the existing BrowPOS APIs in the current frontend app.

## Status
- Completed
- Build status: `cd frontend && npm run build` passes

## Source Artifacts Found
- Design system reference:
  - `frontend/stitch 2/brow_slate_enterprise/DESIGN.md`
- Page templates:
  - `frontend/stitch 2/login_page/code.html`
  - `frontend/stitch 2/dashboard_page/code.html`
  - `frontend/stitch 2/attendance_kiosk/code.html`
  - `frontend/stitch 2/attendance_logs/code.html`
  - `frontend/stitch 2/staff_management/code.html`
  - `frontend/stitch 2/service_catalog/code.html`
  - `frontend/stitch 2/pos_terminal/code.html`
  - `frontend/stitch 2/receipt_view/code.html`

## Constraints
- Keep using current backend APIs already implemented.
- Preserve role-based access behavior from backend security.
- Use `fetch` (already in place).
- Do not put secrets in frontend.

## Integration Approach
We will not serve the raw HTML pages directly. Instead, we will:
1. Extract visual/layout patterns from Stitch templates.
2. Rebuild them as React components/routes in the existing Vite app.
3. Bind components to existing `frontend/src/lib/api.ts` endpoints.
4. Keep a reusable design token layer based on `brow_slate_enterprise/DESIGN.md`.

## Implemented Structure
- `frontend/src/layouts/AppShell.tsx`
- `frontend/src/components/common/*` (cards, badges, tables, drawers, toasts)
- `frontend/src/pages/LoginPage.tsx`
- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/pages/AttendanceKioskPage.tsx`
- `frontend/src/pages/AttendanceLogsPage.tsx`
- `frontend/src/pages/StaffManagementPage.tsx`
- `frontend/src/pages/ServiceCatalogPage.tsx`
- `frontend/src/pages/AppointmentsPage.tsx`
- `frontend/src/pages/PosTerminalPage.tsx`
- `frontend/src/pages/ReceiptsPage.tsx`
- `frontend/src/pages/RefundsPage.tsx`
- `frontend/src/pages/CommissionPage.tsx`
- `frontend/src/pages/SalesReportPage.tsx`
- `frontend/src/pages/AuditLogsPage.tsx`
- `frontend/src/styles/app.css`

## Page-to-API Mapping

### 1) Login Page
Template: `stitch 2/login_page`
- API: `POST /api/auth/login`
- Output: store JWT, role, username

### 2) Dashboard Page
Template: `stitch 2/dashboard_page`
- APIs:
  - `GET /api/reports/sales-summary`
  - `GET /api/receipts/history`
  - `GET /api/attendance/report`

### 3) Attendance Kiosk Page
Template: `stitch 2/attendance_kiosk`
- APIs:
  - `POST /api/attendance/verify-face`
  - `POST /api/attendance/clock-in`
  - `POST /api/attendance/break-start`
  - `POST /api/attendance/break-end`
  - `POST /api/attendance/clock-out`
- Webcam + fallback upload retained

### 4) Attendance Logs Page
Template: `stitch 2/attendance_logs`
- API: `GET /api/attendance/report`
- Filters + table + pagination

### 5) Staff Management Page
Template: `stitch 2/staff_management`
- APIs:
  - `GET /api/staff`
  - `POST /api/staff`
  - `POST /api/staff/{staffId}/face/re-enroll`

### 6) Service Catalog Page
Template: `stitch 2/service_catalog`
- APIs:
  - `GET /api/services`
  - `POST /api/services`

### 7) POS Terminal Page
Template: `stitch 2/pos_terminal`
- API: `POST /api/transactions`
- Secondary data helpers from services/staff lists

### 8) Receipt View / Receipt History
Template: `stitch 2/receipt_view`
- APIs:
  - `GET /api/receipts/{receiptNo}`
  - `GET /api/receipts/history`
  - `GET /api/receipts/history/export`

### 9) Refunds
Template direction: commerce controls from dashboard/terminal
- API:
  - `POST /api/refunds`

### 10) Commission
Template direction: management/reporting module
- API:
  - `GET /api/commission/staff/{staffId}/statement`

### 11) Sales Report
Template direction: dashboard KPI/report style
- API:
  - `GET /api/reports/sales-summary`

### 12) Audit Logs
Template direction: management table/filter shell
- API:
  - `GET /api/audit-logs`

## Route Map (Implemented)
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

## Notes on Fidelity
- Stitch visual language is preserved via:
  - slate neutral palette
  - Manrope + Inter typography pairing
  - sidebar monolith layout
  - rounded cards and tonal layering
  - gradient primary action buttons
- Original Stitch files remain untouched under `frontend/stitch 2/` as source references.

## File Move / Asset Handling
- Keep original Stitch files in `frontend/stitch 2/` as immutable design source.
- Do not delete originals during initial integration.
- Copy/adapt relevant snippets into React components.
- If we extract reusable SVG/icons later, place under `frontend/src/assets/stitch2/`.

## Quality Gates
- Frontend build must pass (`npm run build`).
- Each page must have at least one live API call wired.
- Authentication and role behavior must match backend responses.
- Attendance camera flow must remain functional on desktop + mobile fallback.

## Risks and Mitigations
- Risk: raw Tailwind-in-HTML templates are not componentized.
  - Mitigation: convert incrementally into reusable React blocks.
- Risk: API field mismatch on forms.
  - Mitigation: rely on existing typed `api.ts` + `types.ts`.
- Risk: route-level role confusion.
  - Mitigation: add explicit role guards and hidden nav entries.

## Deliverables (Done)
1. React hash-route frontend using Stitch 2 visual language.
2. All currently available APIs in `frontend/src/lib/api.ts` integrated in UI pages.
3. Updated README frontend section with route map and run instructions.
