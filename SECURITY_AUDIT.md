# Learnfy Backend Security & Backend Audit

## Scope

Audited the Node.js/Express/Mongoose backend under `src/`, its models, routes, middleware, Passport strategy, Fawry integration, YouTube upload service, server configuration, environment handling, and the available project tests.

## Changes Made

- Fixed the Linux case-sensitive startup failure caused by importing `logger.mjs` instead of `Logger.mjs`.
- Separated database connection startup from app construction so the Express app can be tested without an active MongoDB connection.
- Added strict request-body, parameter, and webhook validation with a consistent `{ success, message, errors }` validation shape.
- Prevented mass assignment of `teacher`, `role`, `students`, and `rating` fields through the public create/update APIs.
- Added ObjectId, email, username, phone, password, monetary, URL, YouTube URL, duration, ordering, enum, and unexpected-field validation.
- Added centralized HTTP error handling for Mongoose validation/cast/duplicate errors, malformed JSON, and Multer upload errors.
- Added security headers, controlled CORS, body-size limits, trust-proxy configuration, and production cookie hardening.
- Added configurable IP-based rate limits for the general API, authentication, registration, payments, and Fawry webhooks.
- Closed the user profile IDOR: authenticated users can only retrieve their own profile.
- Added authenticated profile update, logout, and self-delete routes while using `req.user` as the authority.
- Added session regeneration at login to reduce session-fixation risk and destroy sessions at logout/delete.
- Added published-course visibility rules and teacher ownership enforcement.
- Restricted lesson access to enrolled students, course owners, or preview lessons.
- Added course/lesson ownership checks and a unique `(course, order)` lesson constraint.
- Added a unique pending-payment constraint per user/course and unique sparse payment reference/transaction indexes.
- Fixed free-course enrollment so `payment: null` is valid.
- Ensured paid payment amount comes from the server-side course price, never the request body.
- Added an authenticated payment-status endpoint scoped to the authenticated user.
- Hardened Fawry webhook verification with exact V2 signature construction, constant-time signature comparison, payment-method/amount validation, and idempotent processing.
- Preserved private YouTube uploads and added file-size, MIME-type, extension, one-file, and cleanup protections.
- Added `.env.example` and `.gitignore`; real `.env` is excluded from the deliverable.
- Added automated tests using Node's built-in test runner; no new runtime dependency was required.

## Endpoints Audited

| Method | Route | Auth | Role / ownership | Validation | Rate limit |
|---|---|---|---|---|---|
| GET | `/health` | No | — | — | No |
| GET | `/api/user/:id` | Yes | Self only | ObjectId | General |
| POST | `/api/user/auth/login` | No | — | username/password | Auth |
| POST | `/api/user/auth/register` | No | — | full registration | Registration |
| PATCH | `/api/user` | Yes | Self | profile fields | General |
| POST | `/api/user/auth/logout` | Yes | Self session | — | General |
| DELETE | `/api/user` | Yes | Self | — | General |
| GET | `/api/courses` | No | Published for non-teachers; own courses for teachers | — | General |
| GET | `/api/courses/:courseId` | Yes | Teacher sees published/own; others published | ObjectId | General |
| POST | `/api/courses` | Yes | Teacher | strict body validation | General |
| DELETE | `/api/courses/:courseId` | Yes | Teacher + owner | ObjectId | General |
| GET | `/api/courses/:courseId/lessons` | Yes | Owner/enrolled/preview | ObjectId | General |
| GET | `/api/courses/:courseId/lessons/:lessonId` | Yes | Owner/enrolled/preview | ObjectIds | General |
| POST | `/api/courses/:courseId/lessons` | Yes | Teacher + course owner | ObjectId + multipart/body validation | General |
| PATCH | `/api/courses/:courseId/lessons/:lessonId` | Yes | Teacher + lesson owner | ObjectIds + strict body | General |
| DELETE | `/api/courses/:courseId/lessons/:lessonId` | Yes | Teacher + lesson owner | ObjectIds | General |
| POST | `/api/payments/create` | Yes | Student | courseId | Payment |
| GET | `/api/payments/:paymentId` | Yes | Payment owner | ObjectId | General |
| POST | `/api/payments/fawry/webhook` | No | Fawry signature + payload checks | strict webhook validation | Webhook |

## Tests Performed

`npm test` passed with **10/10 tests**.

Coverage includes route-level baseline checks, protected-route authentication failures, unexpected fields, malformed ObjectIds, invalid JSON, authentication rate limiting with HTTP 429, password hashing path, free-course enrollment without Fawry, Fawry V2 webhook signature validation and duplicate-webhook idempotency, payment-status response minimization, and cross-user profile denial.

All source and test `.mjs` files also pass `node --check` syntax validation.

## External / Integration Tests Not Completed

- MongoDB-backed positive endpoint tests could not be executed because the configured MongoDB endpoint refused the connection on `127.0.0.1:27017`.
- Fawry live API calls could not be executed because Fawry credentials/configuration were not present in the supplied environment.
- YouTube uploads could not be executed because Google/YouTube OAuth credentials and refresh token were not present.
- `npm audit` could not retrieve advisory data because the environment could not resolve `registry.npmjs.org`.

These were not represented as successful live integration tests.

## Remaining Risks / Manual Verification

- The rate limiter is in-process memory state. A multi-instance deployment should move rate-limit state to a shared store (for example Redis) before horizontal scaling.
- Run MongoDB-backed integration tests in an environment with a reachable database, including concurrent enrollment/payment/webhook races.
- Run Fawry sandbox tests for paid, canceled, expired, invalid-signature, invalid-amount, and duplicate notification scenarios.
- Run the YouTube upload flow with the platform's OAuth refresh token and verify the resulting videos remain private.
- Rotate any real credentials that were ever exposed through the original `.env` artifact; the deliverable intentionally excludes that file.
