# BrowPOS Frontend Page Specification (For Stitch)

## 1) Scope and Product Intent
This document defines all frontend pages needed for BrowPOS internal operations.
The goal is to generate production-ready UI designs that map directly to backend APIs.

Current business decision:
- No customer-profile UX for now
- Staff are profile records (name + face enrollment)
- Attendance uses face verification flow
- POS is internal operations first

## 2) Global App Structure

## 2.1 App Shell
- Fixed left sidebar navigation on desktop
- Collapsible sidebar on tablet/mobile
- Top bar with branch context, quick search, user menu
- Main content area with page header + body
- Global toast/notification area
- Global modal layer

## 2.2 Global UI Patterns
- Table with filter row + pagination + export actions
- Right-side detail drawer for record inspection
- Reusable form sections with validation hints
- Confirm dialogs for destructive/financial actions
- Loading skeletons for each page
- Standardized empty-state panels
- Standardized API error banners with retry

## 2.3 Role-aware Navigation
Roles currently used by backend:
- OWNER
- ADMIN
- MANAGER
- CASHIER
- STYLIST
- IT_ADMIN
- ATTENDANCE_TERMINAL

Navigation items should hide or disable unavailable pages by role.

## 3) Route Map
- `/login`
- `/dashboard`
- `/attendance/kiosk`
- `/attendance/logs`
- `/staff`
- `/services`
- `/appointments`
- `/transactions/new`
- `/receipts`
- `/refunds`
- `/commission`
- `/reports/sales`
- `/audit-logs`
- `/settings/system`

## 4) Page-by-Page Specification

## 4.1 Login Page (`/login`)
Purpose:
- Authenticate POS user

Contains:
- Username input
- Password input
- Login button
- Optional "show password" toggle
- Error panel for invalid credentials

Actions:
- Submit login

API:
- `POST /api/auth/login`

Success behavior:
- Store JWT
- Redirect to role default page

Error behavior:
- Inline credential error
- Preserve username on failed login

## 4.2 Dashboard Page (`/dashboard`)
Purpose:
- Quick operational snapshot for current day

Contains:
- KPI cards: gross sales, net sales, transaction count, refund total
- Active attendance count (clocked in now)
- Recent receipts list
- Quick actions: New Transaction, Attendance Kiosk, Create Appointment

APIs:
- `GET /api/reports/sales-summary`
- `GET /api/receipts/history`
- `GET /api/attendance/report`

States:
- Default date range = today
- Branch filter control at top

## 4.3 Attendance Kiosk Page (`/attendance/kiosk`)
Purpose:
- Fast clock-in/out station for staff using face verification

Contains:
- Staff ID input
- Branch ID input
- Camera viewport
- Start Camera button
- Capture button
- Fallback upload button/input
- Captured selfie preview
- Verify Face button
- Clock In button
- Break Start button
- Break End button
- Clock Out button
- Verification token status badge
- Last action result panel

APIs:
- `POST /api/attendance/verify-face`
- `POST /api/attendance/clock-in`
- `POST /api/attendance/break-start`
- `POST /api/attendance/break-end`
- `POST /api/attendance/clock-out`

Validation and rules:
- Verify enabled only when selfie + staffId present
- Clock in/out enabled only when verification token exists
- Token consumed after clock-in or clock-out
- Clear and explicit failure reason display

## 4.4 Attendance Logs / Report Page (`/attendance/logs`)
Purpose:
- Review attendance history and productivity windows

Contains:
- Filters: staffId, branchId, from date, to date
- Pagination controls: page, size
- Table columns:
  - attendance id
  - staff id
  - staff name
  - branch id
  - clock in
  - clock out
  - break minutes
  - worked minutes
  - status
- Row detail drawer
- Export placeholder button (future CSV endpoint)

API:
- `GET /api/attendance/report`

Edge states:
- No records for selected range
- Invalid range (`to < from`)

## 4.5 Staff Management Page (`/staff`)
Purpose:
- Manage staff profiles and biometric enrollment lifecycle

Contains:
- Staff list table
- Filters: role type, active status, name search
- Create Staff form:
  - display name
  - role type
  - active toggle
  - enrollment photo upload (required)
- Re-enroll Face action:
  - select staff
  - upload new enrollment photo
- Enrollment status indicators per staff

APIs:
- `GET /api/staff`
- `POST /api/staff`
- `POST /api/staff/{staffId}/face/re-enroll`

UX notes:
- Re-enroll action should be strongly separated and warned
- Show success message including face profile id

## 4.6 Service Catalog Page (`/services`)
Purpose:
- Create and manage billable services

Contains:
- Service table
- Filters: category, name
- Create Service form:
  - category name or category id
  - service name
  - price
  - duration minutes
  - commission type
  - commission value
  - active flag

APIs:
- `GET /api/services`
- `POST /api/services`

Validation:
- Price > 0
- Duration > 0
- Duplicate names in same category should surface backend error clearly

## 4.7 Appointments Page (`/appointments`)
Purpose:
- Create, view, progress, and convert appointments to bill

Contains:
- Create Appointment form:
  - customer id (optional)
  - staff id (optional)
  - branch id
  - service id (optional)
  - start datetime
  - end datetime
  - status
  - deposit amount
  - notes
- Appointment list with filters:
  - from datetime
  - to datetime
  - branch id
  - status
- Update status action
- Convert-to-bill action with payment modal

APIs:
- `POST /api/appointments`
- `GET /api/appointments`
- `PATCH /api/appointments/{id}/status`
- `POST /api/appointments/{id}/convert-to-bill`

## 4.8 New Transaction Page (`/transactions/new`)
Purpose:
- Build and submit POS transaction

Contains:
- Header fields:
  - branch id
  - cashier id
  - customer id (optional)
  - discount total
- Line items builder:
  - service id
  - qty
  - discount amount
  - assigned staff id
- Payments builder:
  - method
  - amount
  - reference no
- Calculated summary panel:
  - subtotal
  - discount
  - final total
- Submit transaction button
- Success panel with receipt no and transaction id

API:
- `POST /api/transactions`

Validation:
- Payment totals must match final total
- Prevent submit with empty lines or empty payments

## 4.9 Receipts Page (`/receipts`)
Purpose:
- Lookup single receipt and browse receipt history

Contains:
- Quick lookup by receipt no
- History filter bar:
  - receipt no
  - branch id
  - cashier id
  - status
  - from date
  - to date
- History table
- Export CSV button
- Receipt JSON viewer modal/drawer

APIs:
- `GET /api/receipts/{receiptNo}`
- `GET /api/receipts/history`
- `GET /api/receipts/history/export`

## 4.10 Refunds Page (`/refunds`)
Purpose:
- Create refund requests and confirm financial correction

Contains:
- Refund form:
  - receipt no (optional)
  - transaction id (optional)
  - approved by
  - reason
  - total refund (optional for full)
- Preview block for affected transaction (future enhancement)
- Submit button
- Result panel with refund id and timestamp

API:
- `POST /api/refunds`

Risk controls:
- Confirmation dialog before submit
- Require reason text

## 4.11 Commission Page (`/commission`)
Purpose:
- View staff commission statement for date ranges

Contains:
- Staff selector/input
- Date range controls
- Statement cards:
  - earned
  - reversal
  - net
- Optional monthly trend chart placeholder

API:
- `GET /api/commission/staff/{staffId}/statement`

## 4.12 Sales Report Page (`/reports/sales`)
Purpose:
- Aggregate sales analytics by date range and optional branch

Contains:
- Date range controls
- Branch filter (optional)
- KPI cards:
  - gross sales
  - net sales
  - discount total
  - refund total
  - average bill
  - transaction count
- Trend chart placeholder

API:
- `GET /api/reports/sales-summary`

## 4.13 Audit Logs Page (`/audit-logs`)
Purpose:
- Review sensitive system actions and history

Contains:
- Filters:
  - entity type
  - action contains
  - from date
  - to date
  - page
  - size
- Table columns:
  - id
  - actor username
  - entity type
  - entity id
  - action
  - created at
- Before/after JSON diff viewer in drawer

API:
- `GET /api/audit-logs`

## 4.14 System Settings Page (`/settings/system`)
Purpose:
- Operational system settings and environment diagnostics

Contains:
- Read-only configuration cards (non-secret)
- Attendance terminal account metadata panel (username/role only)
- Face threshold and token TTL display
- Build/version info

Notes:
- No secret values rendered in UI
- Config values should come from secure backend endpoint (future)

## 5) Cross-page Components Required
- Auth guard wrapper
- Role guard wrapper
- API client with JWT attach + 401 interceptor behavior
- Error boundary
- Date range picker
- Money formatter
- Status badge component
- Paginated table component
- JSON viewer component
- Camera capture component (desktop + mobile fallback)

## 6) Design Direction for Stitch
- Visual style: clean, enterprise, high readability
- Density: medium, optimized for operator speed
- Typography: clear hierarchy for data-heavy views
- Color system:
  - neutral UI base
  - semantic status colors (success/warn/error/info)
- Motion: minimal, purposeful (loading/success transitions)
- Mobile behavior:
  - attendance kiosk fully mobile-friendly
  - table-heavy pages prioritize desktop/tablet

## 7) Prioritized Build Order
1. Login
2. Attendance Kiosk
3. Attendance Logs
4. Staff
5. Services
6. New Transaction
7. Receipts
8. Refunds
9. Commission
10. Sales Report
11. Appointments
12. Audit Logs
13. Settings

## 8) API Coverage Checklist
- Auth
- Services
- Staff
- Attendance actions
- Attendance report
- Transactions
- Receipts + CSV export
- Refunds
- Commission
- Reports
- Appointments
- Audit logs

