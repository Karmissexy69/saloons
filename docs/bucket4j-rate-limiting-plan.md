# Bucket4j Rate Limiting Plan

## Status

Implemented initial rollout.

Current implementation uses local in-memory Bucket4j buckets inside the Spring application because this project is currently operating as a single EC2-hosted backend and the priority is low latency with minimal operational risk.

That means:

- no extra Flyway migration was needed for rate-limit state
- no extra database round-trip is added for each protected request
- limits are enforced per running app instance

If this backend is later scaled to multiple instances behind a load balancer, the next upgrade should be switching the bucket store to PostgreSQL or Redis-backed shared state.

## Goal

Integrate Bucket4j into this Spring Boot backend to reduce abuse, protect the AWS-backed flows, and keep Rekognition and S3 costs predictable.

This plan is written for the current stack:

- Spring Boot 3.3.5
- Java 21
- PostgreSQL
- JWT auth
- AWS Rekognition for face verification/enrollment
- AWS S3 for biometric storage and payment-proof receipt uploads

## Why Bucket4j Here

Bucket4j is the right tool for inbound API rate limiting in this project because:

- it is purpose-built for request throttling
- it supports distributed storage backends
- we already have PostgreSQL, so we can share rate limits across multiple app instances without adding Redis immediately
- the main billing risk in this repo comes from repeated API calls that trigger AWS services

## Where AWS Cost Risk Exists In This Repo

The expensive paths are not all APIs equally.

### Highest-cost endpoints

1. `POST /api/attendance/verify-face`
   - Controller: `backend/src/main/java/com/salonpos/controller/AttendanceController.java`
   - Service flow: `AttendanceService.verifyFace(...)`
   - AWS calls:
     - `DetectFaces`
     - `SearchFacesByImage`
   - Current implementation in `AwsRekognitionFaceRecognitionService` does two Rekognition operations for a normal verification path.

2. `POST /api/staff`
   - Controller: `backend/src/main/java/com/salonpos/controller/StaffController.java`
   - Used for new staff enrollment
   - AWS calls:
     - `DetectFaces`
     - `IndexFaces`
     - S3 upload through the biometric storage service

3. `POST /api/staff/{staffId}/face/re-enroll`
   - Controller: `backend/src/main/java/com/salonpos/controller/StaffController.java`
   - AWS calls:
     - `DetectFaces`
     - `IndexFaces`
     - S3 upload

4. `POST /api/transactions`
   - Controller: `backend/src/main/java/com/salonpos/controller/TransactionController.java`
   - When payment method is `CARD` or `QR`, the request can store proof-of-payment images in S3 through `PaymentProofStorageService`

### Secondary-risk endpoints

These are not the main AWS bill drivers, but still need protection:

- `POST /api/auth/login`
- `POST /api/attendance/clock-in`
- `POST /api/attendance/clock-out`
- `POST /api/attendance/break-start`
- `POST /api/attendance/break-end`
- `POST /api/appointments`
- `PATCH /api/appointments/{id}/status`
- `POST /api/appointments/{id}/convert-to-bill`
- `POST /api/refunds`
- receipt/report export endpoints

## Recommended Architecture

Initial rollout uses Bucket4j with local in-memory bucket state.

Future scale-out option is PostgreSQL-backed distributed bucket state.

### Why the first rollout uses local buckets

- this app currently appears to run as a single EC2 deployment
- local buckets are faster and simpler
- there is no extra database overhead on normal requests
- this reduces the chance of impacting daily operations while still stopping spam and abuse

### When to move to PostgreSQL-backed buckets

- this backend already depends on PostgreSQL
- the limit state is shared across nodes if you later run multiple app instances
- it avoids the unsafe behavior of per-instance in-memory limits
- it still avoids adding Redis right now just for rate limiting

### Do not start with in-memory buckets

In-memory limits are fine for local dev, but they are not safe for production billing protection if you ever scale horizontally, because each node would allow its own separate quota.

## Integration Shape

I would implement rate limiting as a custom servlet filter plus a small routing/resolution layer, not as scattered annotations.

That gives us:

- one place to define policies
- one place to build keys
- predictable ordering with JWT auth
- support for IP-based, username-based, staff-based, and endpoint-based limits

## Proposed Backend Changes

### 1. Add Bucket4j dependencies

Implemented with Bucket4j core in `backend/pom.xml`.

Current dependency direction:

- Bucket4j core for token-bucket logic

Future upgrade:

- Bucket4j PostgreSQL/JDBC integration for shared bucket state

## 2. Add rate-limit properties

Add a new config section to `backend/src/main/resources/application.yml`, for example:

```yml
app:
  rate-limit:
    enabled: true
    trust-forward-headers: false
    login:
      per-ip-per-minute: 5
      per-username-per-15-minutes: 8
    verify-face:
      per-ip-per-5-minutes: 20
      per-staff-per-5-minutes: 6
    face-enrollment:
      per-user-per-hour: 12
    transactions:
      per-ip-per-minute: 60
      per-user-per-minute: 40
    reads:
      per-user-per-minute: 240
```

These values are starting points, not final constants.

## 3. Add a Flyway migration for Bucket4j state

Not required for the current in-memory rollout.

Future upgrade path:

- `backend/src/main/resources/db/migration/V10__bucket4j_rate_limits.sql`

This migration will create the Bucket4j state table used by the PostgreSQL proxy manager.

I would keep Bucket4j state in its own dedicated table, not mixed into domain tables.

## 4. Add rate-limit config classes

Implemented classes:

- `backend/src/main/java/com/salonpos/config/RateLimitProperties.java`
- `backend/src/main/java/com/salonpos/config/RateLimitConfig.java`
- `backend/src/main/java/com/salonpos/ratelimit/RateLimitBucketService.java`
- `backend/src/main/java/com/salonpos/ratelimit/RateLimitFilter.java`
- `backend/src/main/java/com/salonpos/ratelimit/ClientIpResolver.java`
- `backend/src/main/java/com/salonpos/ratelimit/CachedBodyHttpServletRequest.java`

Responsibilities:

- bind the `app.rate-limit` config tree
- build the PostgreSQL-backed proxy manager
- expose named bucket configurations for different endpoint classes

## 5. Add request key resolution

Implemented classes:

- `backend/src/main/java/com/salonpos/ratelimit/ClientIpResolver.java`

Key rules:

- always include endpoint family
- include client IP for anonymous and terminal traffic
- include username when authenticated
- include `staffId` for face verification and clock operations when available
- optionally include branch context later if we decide to send branch in a request header

### Example keys

- `auth:login:ip:203.0.113.10`
- `auth:login:user:terminal`
- `attendance:verify-face:ip:203.0.113.10`
- `attendance:verify-face:staff:12:ip:203.0.113.10`
- `staff:enroll:user:itadmin`
- `transactions:create:user:terminal:ip:203.0.113.10`
- `receipts:history:user:terminal`

## 6. Add policy routing

Implemented via the filter and policy-name constants:

- `backend/src/main/java/com/salonpos/ratelimit/RateLimitPolicyNames.java`
- `backend/src/main/java/com/salonpos/ratelimit/RateLimitFilter.java`

This layer decides which endpoints get which buckets.

I do not want endpoint logic buried inside the filter itself.

## 7. Add a filter into the Spring Security chain

Implemented:

- `backend/src/main/java/com/salonpos/ratelimit/RateLimitFilter.java`

Integration point:

- registered in `SecurityConfig`
- placed after `JwtAuthenticationFilter`

Why after JWT:

- protected endpoints can use authenticated username/role in the key
- login still works because the request is unauthenticated and can fall back to IP plus parsed username

### Special handling for `/api/auth/login`

The login endpoint should use two checks:

1. per-IP bucket
2. per-username bucket

That prevents:

- brute force from one IP against many usernames
- distributed guessing against one username

For login, the filter should read the username from the request body using a caching request wrapper so the controller can still read the body afterward.

## 8. Add a 429 response contract

Implemented directly in `RateLimitFilter` as a JSON `429` response.

Response shape should match the current API style:

```json
{
  "timestamp": "2026-04-04T10:15:30Z",
  "status": 429,
  "error": "Rate limit exceeded. Try again later."
}
```

I would also add:

- `Retry-After`
- `X-Rate-Limit-Remaining`
- `X-Rate-Limit-Retry-After-Seconds`

where practical.

## Initial Endpoint Policy Matrix

These are the initial limits I would implement first.

| Endpoint | Reason | Key | Starting limit |
| --- | --- | --- | --- |
| `POST /api/auth/login` | brute-force and credential stuffing protection | IP and username | 5/min per IP, 8/15 min per username, 30/hour per IP |
| `POST /api/attendance/verify-face` | biggest Rekognition bill risk | IP and staffId+IP | 20/5 min per IP, 6/5 min per staffId+IP |
| `POST /api/staff` | expensive face enrollment | authenticated username | 6/hour per user |
| `POST /api/staff/{staffId}/face/re-enroll` | expensive re-enrollment | authenticated username and target staffId | 6/hour per user, 3/hour per staffId |
| `POST /api/transactions` | S3 proof upload risk and write protection | authenticated username+IP | 40/min per user+IP, 300/hour per user |
| `POST /api/appointments/{id}/convert-to-bill` | write-heavy and indirectly creates transactions | authenticated username | 20/min per user |
| `POST /api/refunds` | sensitive write action | authenticated username | 10/min per user |
| `GET /api/receipts/history` | DB-heavy list endpoint | authenticated username | 120/min per user |
| `GET /api/receipts/history/export` | export can be expensive | authenticated username | 10/5 min per user |
| `GET /api/reports/sales-summary` | report endpoint | authenticated username | 60/min per user |

## Important Behavior Decisions

### Use layered limits on expensive endpoints

For `verify-face`, I would not use only one bucket.

I would check:

1. a route-level bucket by IP
2. a route-level bucket by staffId plus IP

The request is allowed only if both buckets have capacity.

That prevents:

- one kiosk spamming Rekognition across many staff
- repeated spam against one staff member

### Keep normal salon traffic working

The limits above are intentionally not ultra-tight.

For example, `verify-face` allows shift-start bursts from one kiosk, but still blocks runaway retry loops.

### Separate read limits from write limits

Read-heavy endpoints should not compete with expensive AWS-backed flows.

## Extra Controls Needed Beyond Bucket4j

Rate limiting alone is not enough if the goal is "do not get a high AWS bill."

I would pair Bucket4j with these controls:

### 1. Tight image size validation

Current biometric image validation already rejects files above 5 MB in `FaceImageService`.

I would also add:

- a stricter max size for payment-proof images in `TransactionService`
- rejection before any S3 upload

Recommended payment-proof cap:

- 2 MB decoded image size

### 2. Image compression / normalization

Before calling Rekognition or uploading proof images:

- normalize to JPEG
- resize large images server-side if needed

That reduces payload size and storage growth.

### 3. S3 lifecycle rules

For payment-proof images:

- set an S3 lifecycle retention policy
- archive or delete after the business retention window

Without this, storage cost can grow even if request rate is controlled.

### 4. No blind retries on AWS client errors

Do not add automatic retries on:

- invalid image input
- face not found
- user misuse

Retries should only be considered for true transient infrastructure failures, and even then they should be bounded.

### 5. Monitoring

Add counters for:

- rate-limit rejections by endpoint
- Rekognition verification calls
- face enrollment calls
- S3 payment-proof uploads

This makes it easy to see whether limits are too loose or too strict.

## Implementation Order

I would implement this in the following order.

### Phase 1

- add Bucket4j dependencies
- add rate-limit config properties
- add migration for the Bucket4j state table
- add the filter and policy registry
- protect:
  - `/api/auth/login`
  - `/api/attendance/verify-face`
  - `/api/staff`
  - `/api/staff/{staffId}/face/re-enroll`
  - `/api/transactions`

This phase covers the biggest AWS bill risk.

### Phase 2

- protect appointment conversion
- protect refunds
- protect receipt export and report endpoints
- add response headers and metrics

### Phase 3

- optionally send branch context in a request header for better terminal/device separation
- tune limits from real usage data

## Testing Plan

I would add integration tests for:

- login bucket exhausted returns `429`
- verify-face bucket exhausted returns `429`
- different staff IDs on the same IP do not incorrectly share the exact same staff bucket
- protected endpoints use authenticated username in the key
- limits reset correctly after refill
- PostgreSQL-backed buckets work across separate application contexts

## Files I Expect To Touch

### Existing files

- `backend/pom.xml`
- `backend/src/main/resources/application.yml`
- `backend/src/main/java/com/salonpos/config/SecurityConfig.java`
- `backend/src/main/java/com/salonpos/exception/ApiExceptionHandler.java`
- `backend/src/main/java/com/salonpos/service/TransactionService.java`

### New files

- `backend/src/main/java/com/salonpos/config/RateLimitProperties.java`
- `backend/src/main/java/com/salonpos/config/Bucket4jConfig.java`
- `backend/src/main/java/com/salonpos/ratelimit/RateLimitFilter.java`
- `backend/src/main/java/com/salonpos/ratelimit/RateLimitPolicy.java`
- `backend/src/main/java/com/salonpos/ratelimit/RateLimitPolicyRegistry.java`
- `backend/src/main/java/com/salonpos/ratelimit/RateLimitKeyResolver.java`
- `backend/src/main/java/com/salonpos/ratelimit/ClientIpResolver.java`
- `backend/src/main/java/com/salonpos/exception/TooManyRequestsException.java`
- `backend/src/main/resources/db/migration/V10__bucket4j_rate_limits.sql`

## Final Recommendation

Use Bucket4j first, and focus the first rollout on the AWS-costly endpoints.

If the goal is to keep AWS spend under control, the single most important endpoint to throttle is:

- `POST /api/attendance/verify-face`

That is the one I would protect first before anything else.

## Reference Links

- Bucket4j reference: https://bucket4j.com/8.17.0/toc.html
- Resilience4j overview: https://resilience4j.readme.io/
