# Attendance Face Verification Plan (AWS Rekognition)

## Goal
Use AWS Rekognition to verify staff identity during attendance events.

Core rule:
- During staff creation, at least one face photo is required (enrollment).
- During future clock-in, submitted selfie must match enrolled face.
- If similarity is **>= 80%**, mark attendance as clocked-in/present for the day.

## High-Level Flow

### 1) Staff Enrollment (Create Staff)
1. Frontend collects:
- Staff profile data
- Enrollment photo (clear front-facing face image)
2. Backend creates staff record.
3. Backend uploads image to private S3 path (`staff-faces/{staffId}/enrollment/{uuid}.jpg`).
4. Backend indexes face in Rekognition Collection using `IndexFaces`.
5. Backend stores returned `FaceId` and metadata in DB.
6. Staff creation succeeds only if face enrollment succeeds.

### 2) Clock-In Verification
1. Staff opens clock-in flow and captures a live selfie.
2. Frontend sends selfie + `staffId` to attendance verify endpoint.
3. Backend calls Rekognition `SearchFacesByImage` (or `CompareFaces`, see decision below).
4. Backend checks best match for that staff:
- similarity >= 80% -> verified
- similarity < 80% -> rejected
5. If verified, backend performs existing attendance clock-in logic and marks present.
6. Backend saves verification audit details (similarity score, request id, image refs, time).

## API Changes

### New/Updated Internal Endpoints

#### `POST /api/staff`
- Add required image input for face enrollment.
- Multipart request preferred:
- `profile` JSON part
- `enrollmentPhoto` file part

Example multipart parts:
- `profile`: `{ "name": "Asha", "role": "STYLIST", "branchId": 1 }`
- `enrollmentPhoto`: jpeg/png image

Validation:
- Staff create fails without photo.
- Reject if no detectable face or multiple faces.

#### `POST /api/attendance/clock-in`
Option B (selected):
- `POST /api/attendance/verify-face`
- If success, return short-lived verification token.
- Existing `POST /api/attendance/clock-in` consumes token.

Why Option B:
- Cleaner separation of biometric verification vs attendance action.
- Better audit and retry handling.

## Data Model Additions

### Table: `staff_face_profiles`
- `id`
- `staff_id` (FK)
- `rekognition_collection_id`
- `rekognition_face_id`
- `s3_enrollment_key`
- `quality_score` (optional)
- `is_active`
- `created_at`
- `updated_at`

### Table: `attendance_face_verifications`
- `id`
- `staff_id` (FK)
- `attendance_id` (nullable FK; linked when clock-in succeeds)
- `similarity`
- `threshold`
- `match_result` (`PASS`/`FAIL`)
- `rekognition_request_id`
- `s3_probe_image_key`
- `failure_reason` (e.g., NO_FACE_DETECTED, LOW_SIMILARITY)
- `created_at`

## Rekognition Integration Decision

### Recommended: `SearchFacesByImage` with one Collection
- Keep one collection (e.g., `salonpos-staff-faces`).
- Each staff has indexed face(s) with external image id = `staffId`.
- Clock-in selfie searches collection and we enforce returned match belongs to that `staffId`.

Alternative: `CompareFaces`
- Compare selfie against one stored enrollment image only.
- Simpler but less flexible for multiple enrollment images and scaling.

## Matching & Threshold Rules
- Default threshold: `80.0` similarity.
- Configurable via property:
- `attendance.face-match-threshold=80`
- Optional stricter policy for sensitive branches (85-90).
- Reject if:
- No face detected
- More than one face in probe image
- Match belongs to different staff
- Similarity below threshold

## Security & Privacy
- S3 bucket must be private; no public URLs.
- Encrypt at rest (SSE-S3 or SSE-KMS).
- Use pre-signed URLs only if strictly needed for review.
- Do not store raw images longer than needed for policy/audit.
- Retention policy (selected):
- Enrollment image: retained until re-enrollment or offboarding policy triggers cleanup.
- Probe/selfie image: monthly cleanup on the **7th**.
- Example: all March probe images are deleted on April 7; April 1-7 probe images remain until May 7.
- Log all access to biometric artifacts.
- Restrict endpoints by role and staff ownership policy.

## Liveness / Anti-Spoofing (Phase 2)
MVP can launch with face similarity only, but spoof risk exists (photo-on-phone attack).

Phase 2 recommendations:
- Challenge flow (blink/turn head)
- Device camera SDK with anti-spoof signals
- Additional heuristics (image metadata, repeated identical frames)

## Failure UX
For failed verification, return structured reason codes:
- `NO_FACE_DETECTED`
- `MULTIPLE_FACES_DETECTED`
- `LOW_SIMILARITY`
- `STAFF_FACE_PROFILE_NOT_FOUND`
- `AWS_REKOGNITION_UNAVAILABLE`

Frontend guidance:
- Prompt retake with quality tips (lighting, remove mask/sunglasses, face centered).
- Allow max retry count per attempt window (e.g., 3 retries).

## Backend Components to Add
- `FaceVerificationService`
- `RekognitionClient` adapter
- `FaceStorageService` (S3)
- `FaceVerificationController` (if using Option B)
- DB migrations for face profile + verification audit tables
- Config class for threshold, collection id, and region

## Configuration (example)
```yaml
aws:
  region: ap-southeast-1
  rekognition:
    collection-id: salonpos-staff-faces
  s3:
    biometric-bucket: salonpos-biometric-private
attendance:
  face-match-threshold: 80
  probe-purge-day-of-month: 7
```

## Rollout Plan
1. Add schema + entities for face profile and verification logs.
2. Implement staff enrollment photo requirement.
3. Implement Rekognition collection + indexing path.
4. Implement clock-in verification endpoint and threshold logic.
5. Link verification pass to existing attendance clock-in service.
6. Add audit logs and reason-code responses.
7. Add Swagger docs + example payloads.
8. Run pilot on one branch, then expand.

## Open Decisions
- Option B API style is selected.
- Monthly probe image purge on day 7 is selected.
- Re-enrollment is allowed, but restricted to IT role only.
- Attendance is self clock-in only via app landing page button.

## Role and UX Decisions (Confirmed)

### Roles
- Add `IT_ADMIN` role for biometric operations.
- Only `IT_ADMIN` can trigger face re-enrollment.

### Re-enrollment API
- `POST /api/staff/{staffId}/face/re-enroll`
- Access: `IT_ADMIN` only
- Behavior:
- Upload new enrollment photo, index new face, deactivate old face profile, keep audit trail.

### Clock-In UX Entry
- App landing page includes `Clock In` button.
- Staff taps `Clock In` to start selfie verification flow.
- If verification passes (`>= 80%`), app proceeds to submit clock-in using verification token.
- No manager-assisted clock-in path in mobile flow.
