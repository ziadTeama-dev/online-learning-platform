# Learnfy Backend - Final Endpoint Inventory

## Public / Authentication

| Method | Route | Auth | Role | Purpose |
|---|---|---:|---|---|
| GET | `/health` | No | — | Reports API/database readiness |
| POST | `/api/user/auth/register` | No | — | Register a new student account |
| POST | `/api/user/auth/login` | No | — | Login and create a session |
| POST | `/api/user/auth/logout` | Yes | Any | Destroy the current session |

## Users

| Method | Route | Auth | Role | Purpose |
|---|---|---:|---|---|
| GET | `/api/user/:id` | Yes | Any | Read only the authenticated user's own profile |
| PATCH | `/api/user` | Yes | Any | Update own username/email/phone |
| DELETE | `/api/user` | Yes | Any | Delete own account and session |

## Admin

| Method | Route | Auth | Role | Purpose |
|---|---|---:|---|---|
| PATCH | `/api/admin/users/:id/role` | Yes | Admin | Change a non-admin user between `student` and `teacher` |

The admin role-management API never accepts `admin` as a target role. The first admin is created by `npm run create-admin`.

## Courses

| Method | Route | Auth | Role | Purpose |
|---|---|---:|---|---|
| GET | `/api/courses` | No | — | List published courses; teachers see their own courses |
| GET | `/api/courses/:courseId` | Yes | Any | Read a published course or the authenticated teacher's own course |
| POST | `/api/courses` | Yes | Teacher | Create a course |
| PATCH | `/api/courses/:courseId` | Yes | Teacher owner | Update a course |
| DELETE | `/api/courses/:courseId` | Yes | Teacher owner | Delete a course when no enrollment/payment records block deletion |

## Lessons

| Method | Route | Auth | Role | Purpose |
|---|---|---:|---|---|
| GET | `/api/courses/:courseId/lessons` | Yes | Student/Teacher | List lessons; students get previews unless enrolled |
| GET | `/api/courses/:courseId/lessons/:lessonId` | Yes | Student/Teacher | Read a lesson; protected lessons require enrollment |
| POST | `/api/courses/:courseId/lessons` | Yes | Teacher owner | Create lesson from YouTube URL or uploaded video |
| PATCH | `/api/courses/:courseId/lessons/:lessonId` | Yes | Teacher owner | Update lesson metadata |
| DELETE | `/api/courses/:courseId/lessons/:lessonId` | Yes | Teacher owner | Delete lesson |

## Payments

| Method | Route | Auth | Role | Purpose |
|---|---|---:|---|---|
| POST | `/api/payments/create` | Yes | Student | Enroll in free courses or create a Fawry payment for paid courses |
| GET | `/api/payments/:paymentId` | Yes | Any authenticated user | Read only the authenticated user's own payment status |
| POST | `/api/payments/fawry/webhook` | No | — | Receive and verify Fawry server notifications |

## Notes

- The public registration endpoint intentionally creates `student` accounts only.
- Teachers are created by an Admin promotion workflow.
- `courseId`, `lessonId`, `paymentId`, and user IDs are validated as MongoDB ObjectIds.
- Role/ownership checks are server-side and use `req.user`.
- Passwords, hashes, secrets, tokens, and payment credentials are not returned in API responses.
- Paid-course amount is always taken from the course stored in MongoDB.
- Free courses enroll directly without creating a Fawry payment.

- User roles supported by the model are `student`, `teacher`, and `admin`; public registration still defaults to `student` and does not accept a role field.


### Added dashboard endpoints (preserve all existing routes)
- GET /api/teacher/courses — authenticated teachers only; returns courses owned by the current teacher.
- GET /api/student/courses — authenticated students only; returns the current student's enrollments with populated course details.

These endpoints are additive and do not remove or change the existing GET /api/courses behavior.
