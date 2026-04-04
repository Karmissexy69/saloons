# Customer Frontend Implementation Plan

## Purpose
This document is the implementation plan for the separate customer-facing frontend that will live alongside the existing POS frontend.

This plan is intentionally frontend-only.

I will not:
- change backend code
- change backend contracts
- overwrite the backend agent's work
- repurpose internal POS-only endpoints as if they were customer-safe

## Source Of Truth
There are two different sources in this repo:

1. `docs/customer-profile-loyalty-appointments-plan.md`
   This describes the intended product direction.
2. The current backend controllers, DTOs, and security rules
   This is the actual contract the frontend can integrate against today.

For implementation, the backend code is the real source of truth.

## Current Backend Reality
The customer/public APIs that already exist in the current repo state and can be used now:

- `POST /api/customer-auth/request-otp`
- `POST /api/customer-auth/verify-otp`
- `POST /api/customer-auth/refresh`
- `POST /api/customer-auth/logout`
- `GET /api/customer/me`
- `PATCH /api/customer/me`
- `GET /api/customer/me/points-history`
- `GET /api/customer/me/vouchers`
- `POST /api/customer/me/vouchers/redeem/{catalogId}`
- `GET /api/customer/me/appointments`
- `POST /api/customer/me/appointments`
- `POST /api/customer/me/appointments/{bookingReference}/cancel`
- `POST /api/public/appointments`
- `POST /api/public/appointments/{bookingReference}/cancel`

Important observed backend details from the current repo state:

- Customer OTP auth is currently email-based, not phone-based.
- Guest cancellation currently uses OTP in the current repo state.
- Customer/public users cannot currently fetch branches, services, or staff.
- Customer users can redeem a voucher by `catalogId`, but there is no customer-facing endpoint to list the redeemable voucher catalog.
- Internal endpoints like `/api/services`, `/api/branches`, and `/api/staff` are still protected for POS/internal roles.

## Agreed Backend Direction
Per the latest product/backend direction, the frontend should target customer-safe lookup endpoints instead of using internal POS endpoints directly.

Planned backend shape:

- `GET /api/public/branches`
  - active branches only
  - fields: `id`, `name`, maybe `address`
- `GET /api/public/services`
  - active services only
  - fields: `id`, `categoryId`, `categoryName`, `name`, `price`, `durationMinutes`
- `GET /api/public/staff`
  - bookable/active staff only
  - fields: `id`, `displayName`
- `GET /api/customer/me/voucher-catalog`
  - authenticated customer only
  - redeemable voucher catalog with catalog metadata and restrictions

Confirmed frontend assumptions from the latest discussion:

- customer login UX is email + OTP
- customer cancellation will not require OTP
- internal APIs must not be exposed as-is to the customer frontend
- seeded branch/service/staff data is no longer the preferred plan if the backend agent is shipping the new public-safe APIs

## Design Direction To Implement
I will use the existing stitched customer references in `browlanding and user facing/stitch/` as the visual baseline:

- landing/home
- services
- booking modal
- customer login
- customer profile edit
- points and vouchers
- redeemed vouchers

I will keep the same editorial visual language:

- serif + sans pairing
- soft ivory/lavender surfaces
- asymmetric hero layouts
- rounded premium cards
- glassy overlays where useful
- strong whitespace and large typography

## Proposed Project Structure
Recommended structure:

- `customer_frontend/`
  - separate Vite React app for the customer experience
- `browlanding and user facing/stitch/`
  - untouched design reference assets used as design references

Reason:
- keeps the actual app separate from stitched reference files
- avoids mixing generated/reference assets with source code
- makes build and dev commands cleaner

## Proposed Runtime Setup
Recommended dev port:

- customer frontend: `5174`

Recommended API strategy:

- use Vite dev proxy for `/api` to `http://localhost:8080`

Reason:
- avoids backend CORS changes
- allows the customer app to run on a different port
- keeps this work frontend-only

## Proposed Page Scope
These are the pages I plan to build in the first pass.

Confirmed scope for pass one:

- landing page
- core customer journey only
- no extra marketing/support pages unless added later

### Public pages
- `/`
  Landing page with editorial hero, featured services, CTA, and booking entry points
- `/services`
  Customer-facing services page matching the stitched layouts
- `/book`
  Public booking page or modal-backed route for guest booking
- `/manage-booking`
  Booking lookup and cancellation flow
- `/login`
  Customer OTP request page
- `/verify`
  OTP verification page

### Authenticated customer pages
- `/account/profile`
  Customer profile view/edit
- `/account/appointments`
  Upcoming and past appointments, plus customer cancellation
- `/account/points`
  Points balance and points history
- `/account/vouchers`
  Customer-owned available vouchers
- `/account/vouchers/history`
  Used/redeemed/expired voucher history

## Proposed Integration Plan
### 1. Auth
Wire the login flow against the existing customer auth APIs:

- request OTP by email
- verify OTP
- store access token + refresh token
- refresh customer session
- logout

### 2. Customer profile
Wire profile pages against:

- `GET /api/customer/me`
- `PATCH /api/customer/me`

Editable fields will follow current backend support:

- name
- phone
- email
- birthday
- favorite staff id
- secondary favorite staff id
- marketing opt-in
- notes

### 3. Loyalty and wallet
Wire wallet pages against:

- `GET /api/customer/me/points-history`
- `GET /api/customer/me/vouchers`

### 4. Customer appointments
Wire signed-in appointment flows against:

- `GET /api/customer/me/appointments`
- `POST /api/customer/me/appointments`
- `POST /api/customer/me/appointments/{bookingReference}/cancel`

### 5. Public booking
Wire guest booking against:

- `POST /api/public/appointments`

### 6. Public-safe lookup data
When the backend agent ships the customer-safe versions, wire public/customer discovery against:

- `GET /api/public/branches`
- `GET /api/public/services`
- `GET /api/public/staff`
- `GET /api/customer/me/voucher-catalog`

### 7. Cancellation flows
Customer cancellation is expected to become a direct cancel flow without OTP.

Current implementation direction:

- use the current cancellation endpoint shape
- assume backend changes, if any, will likely stay on the same endpoint path
- keep the frontend cancellation action isolated so request payload changes are easy to adapt

## Concern Areas
These are the main places where I need your decision before implementation.

### Concern 1: Customer-accessible lookup data does not exist yet
Problem:

- booking needs `branchId`
- booking can optionally use `serviceId`
- booking can optionally use `staffId`
- services page needs service catalog data
- profile design suggests favorite staff/branch selection

But the customer/public frontend cannot currently fetch:

- branches
- services
- staff

Status:

- addressed in principle
- backend agent is preparing public-safe lookup endpoints

Current frontend stance:

- do not use internal POS APIs directly
- do not default to seeded data if the new public-safe APIs are arriving imminently
- keep the lookup layer isolated in case temporary fallback data is still needed during development

### Concern 2: Voucher redemption catalog is not exposed to customer users
Problem:

- customer can redeem by `catalogId`
- customer cannot fetch the voucher catalog that contains those IDs

Status:

- addressed in principle
- backend direction is to expose `GET /api/customer/me/voucher-catalog`

Current frontend stance:

- do not guess voucher catalog IDs
- wire voucher redemption UI against the authenticated customer catalog once available

### Concern 3: Auth UX in docs does not match backend reality
Problem:

- planning doc describes phone + OTP
- current backend uses email + OTP

Status:

- resolved

Decision:

- build email OTP UI

### Concern 4: Cancellation verification flow
Problem:

- earlier backend shape required OTP for cancellation
- latest backend direction is that customer cancellation should not require OTP

Status:

- resolved for frontend direction

Decision:

- use the current cancellation endpoint
- model the UX as a direct cancellation action
- expect backend behavior to evolve behind the same route if needed

### Concern 5: Favorite branch in the design is not backed by customer profile
Problem:

- profile design includes favorite branch
- current `PATCH /api/customer/me` does not include favorite branch

Options:

1. Recommended: remove favorite branch from editable persisted fields
2. Show it as a non-persisted UI preference stored only in local frontend state/local storage

Decision:

- remove favorite branch from v1

### Concern 6: Scope of "all pages"
Potential first-pass interpretation:

- landing
- services
- guest booking
- guest booking management
- customer login/verify
- profile
- appointments
- points
- vouchers
- voucher history

Possible stretch items:

- about/editorial page
- support/contact page
- notifications shell
- full mobile menu states

My recommendation:

- deliver the core customer journey first
- leave purely marketing/support extras for pass two unless you want them included now

## Proposed Implementation Sequence
### Phase 1
- scaffold separate customer app
- add Vite config on port `5174`
- add `/api` proxy to backend
- set up routing, theme tokens, and shared layout primitives

### Phase 2
- build public pages from stitched references
- landing
- services
- booking flow shell
- guest booking management flow shell

### Phase 3
- integrate customer auth
- OTP request
- OTP verify
- token persistence
- refresh/logout handling

### Phase 4
- build authenticated account area
- profile
- appointments
- points history
- owned vouchers
- voucher history

### Phase 5
- wire loading, error, empty, and success states
- responsive polish
- final integration cleanup

## Files I Expect To Add Or Change
Frontend-only, inside the new customer app:

- app scaffold files
- routing files
- shared theme/styles
- API client for customer/public endpoints
- auth/session storage utilities
- public page components
- account page components
- booking and cancellation forms
- temporary seeded catalog data if you approve that option

## Recommendation Summary
My recommended implementation path is:

1. Create the app under `customer_frontend/`
2. Run it on `5174`
3. Use Vite proxy for `/api`
4. Build the customer auth flow as email OTP
5. Build profile, wallet, appointment, guest booking, and cancellation UX against customer-safe contracts
6. Wait for the backend agent's public-safe lookup APIs instead of wiring internal APIs directly
7. Do not fake voucher catalog redemption IDs

## Decisions Needed From You
Latest confirmed decisions:

1. Create the customer app in a new top-level folder: `customer_frontend/`
2. Pass one includes the landing page and core customer journey only
3. Remove favorite branch from v1 profile editing
4. Use the current cancellation endpoint and assume backend changes, if any, will likely remain on that route
