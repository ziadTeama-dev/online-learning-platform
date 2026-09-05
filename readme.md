# Learnfy Backend – Comprehensive Audit Report

## Scope

Reviewed the current backend against the original project routes and the accumulated audited changes. The review covered:

- Express app bootstrap and middleware ordering
- All routes/controllers
- Authentication and authorization
- Request validation and strict field allow-lists
- Session handling
- Password hashing
- Course/lesson ownership checks
- Enrollment protection
- Payment/Fawry flow and webhook validation
- File upload limits and cleanup
- CORS and security headers
- Rate limiting
- Error handling
- Mongoose schemas/indexes
- Automated regression tests

## Route coverage

All active routes from the original project are preserved. The current backend also contains the audited additions:

- `GET /health`
- `PATCH /api/user`
- `POST /api/user/auth/logout`
- `PATCH /api/courses/:courseId`
- `PATCH /api/courses/:courseId/lessons/:lessonId`
- `GET /api/payments/:paymentId`
- `PATCH /api/admin/users/:id/role`
- `GET /api/teacher/courses`
- `GET /api/student/courses`

No original active route was intentionally removed.

## Fixes applied during this review

### 1. Draft-course lesson leakage

Non-owner users can no longer read lesson lists or lesson content from a draft course. Preview lessons remain available only for published courses.

### 2. Lesson upload side-effect ordering

Create Lesson now verifies that exactly one video source (`youtubeUrl` or `video`) was supplied **before** starting a YouTube upload. This prevents an invalid request from creating an external YouTube upload and then returning a validation error.

### 3. Clear Fawry configuration failure

Paid payment creation now returns `503 Payment provider is not configured` before creating a payment record when Fawry credentials/configuration are missing, instead of producing a generic `500` later in the flow.

### 4. Login normalization

Login now applies the shared request normalization middleware so username whitespace is handled consistently with registration/update.

### 5. Empty profile update

`PATCH /api/user` now rejects an empty update body instead of returning a meaningless success response.

### 6. Regression test repair

The test suite was corrected so the admin controller mock matches the Mongoose query chain and the app test has a valid test `SECRET_KEY`.

## Validation review

The backend uses strict allow-lists for JSON bodies and validates:

- MongoDB ObjectIds
- usernames
- email addresses
- Egyptian phone numbers
- passwords
- bounded strings
- URLs (HTTP/HTTPS)
- YouTube URLs / extracted video IDs
- money values and decimal precision
- non-negative durations
- positive lesson order values
- booleans/enums
- multipart lesson fields after type normalization

Unexpected fields are rejected.

## Rate-limit review

Configured limits:

- Global API: 120/min/IP
- Login: 10/15min/IP
- Register: 5/hour/IP
- Payment creation: 5/min/IP
- Fawry webhook: 30/min/IP
- Admin role API: 60/min/IP

The limiter is intentionally simple and in-memory. It is correct for a single Node.js process but is not a cluster-wide/shared rate limiter. For horizontal scaling, use a shared store such as Redis.

## Authentication / session review

- Passwords are bcrypt-hashed.
- Password is excluded from user reads.
- Session ID is regenerated after successful login.
- Logout destroys the session and clears the cookie.
- Session cookie is HTTP-only.
- Production cookie uses `Secure` and `SameSite=Strict`.
- Mongo-backed sessions are used outside test mode.
- `SECRET_KEY` is required and must be at least 32 characters.

## Authorization review

- User profile access is limited to the current user.
- Course writes require teacher role.
- Course writes require teacher ownership.
- Lesson writes require teacher ownership of the parent course.
- Lesson content requires enrollment for students unless the lesson is a preview.
- Admin role management requires admin role.
- Admin HTTP role management can only set `student` or `teacher`.
- `admin` is provisioned through the CLI rather than the public role endpoint.

## Payment review

- Course price is sourced from the database, not the client.
- Free courses enroll without Fawry.
- Duplicate enrollment is prevented by application logic and a unique MongoDB index.
- Payment status reads are scoped to the authenticated payment owner.
- Webhook payloads are strictly validated.
- Webhook signature is checked with a timing-safe comparison.
- Payment method and amount are verified against the stored payment.
- `PAID` processing is idempotent.
- Cancelled/expired payments are transitioned to `failed`.

## Upload review

- Only known video MIME types/extensions are accepted.
- Maximum upload size is configurable.
- One file is accepted.
- Temporary files are cleaned up on response completion/error paths.
- YouTube uploads are forced to private visibility by the service.

One remaining hardening opportunity is content sniffing/magic-byte verification of uploaded video files; the current filter relies on MIME type plus extension.

## CORS / HTTP security review

- CORS is allow-list based via `CORS_ORIGIN`.
- Credentialed CORS is enabled for approved origins.
- `X-Powered-By` is disabled.
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: no-referrer`
- `Permissions-Policy` disables camera/microphone/geolocation.
- HSTS is enabled in production.

## Automated test result

The current suite was run successfully after the audit fixes:

```text
17 tests
17 passed
0 failed
```

Coverage includes route smoke behavior, authentication throttling, validation, password hashing, free enrollment, webhook signature/idempotency, payment ownership, admin role behavior, draft-course protection, multipart normalization, and provider configuration handling.

## Remaining external dependency checks

The only end-to-end external integration still requiring real credentials/provider access is the live Fawry paid-payment lifecycle. The code-level webhook/signature/idempotency tests pass with mocked data, but live Fawry calls require real provider configuration.

YouTube upload also requires valid Google/YouTube OAuth configuration for real file uploads.
