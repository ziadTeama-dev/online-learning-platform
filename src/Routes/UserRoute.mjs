import { Router } from "express";
import { getUser, createUser, deleteUser, userLogin, updateUser, userLogout, getStudentCourses, verifyUser, resendVerificationEmail } from "../Controller/User.mjs";
import "../Strategies/localStategy.mjs";
import { requireAuth } from "../Middleware/authencticationMiddleware.mjs";
import { authorize_ } from "../Middleware/autherizationMiddleware.mjs";
import { normalizeEmail, validateBody, validateParams, validators } from "../Middleware/validation.mjs";
import { createRateLimiter } from "../Middleware/security.mjs";

export const userRouter = Router();
const authLimiter = createRateLimiter({ windowMs: Number(process.env.AUTH_RATE_WINDOW_MS || 900000), max: Number(process.env.AUTH_RATE_MAX || 10), name: "auth" });
const registrationLimiter = createRateLimiter({ windowMs: Number(process.env.REG_RATE_WINDOW_MS || 3600000), max: Number(process.env.REG_RATE_MAX || 5), name: "register" });
const resendVerificationLimiter = createRateLimiter({
    windowMs: Number(
        process.env.RESEND_RATE_WINDOW_MS || 900000
    ),
    max: Number(
        process.env.RESEND_RATE_MAX || 3
    ),
    name: "resend-verification"
});

const verifyEmailLimiter = createRateLimiter({
    windowMs: Number(process.env.VERIFY_RATE_WINDOW_MS || 900000),
    max: Number(process.env.VERIFY_RATE_MAX || 30),
    name: "verify-email"
});

userRouter.get("/api/user/:id", requireAuth, validateParams({ id: validators.objectId }), getUser);
userRouter.get("/api/student/courses", requireAuth, authorize_("student"), getStudentCourses);
userRouter.post("/api/user/auth/login", authLimiter, normalizeEmail,
    validateBody({ allowed: ["username", "password"], required: ["username", "password"], validators: { username: validators.username, password: validators.password } }),
    userLogin);
userRouter.post("/api/user/auth/register", registrationLimiter, normalizeEmail,
    validateBody({ allowed: ["username", "email", "password", "phone"], required: ["username", "email", "password", "phone"], validators: { username: validators.username, email: validators.email, password: validators.password, phone: validators.phone } }),
    createUser);
userRouter.get("/api/user/auth/verify-email",verifyEmailLimiter,verifyUser)
userRouter.post("/api/user/auth/verify-email",resendVerificationLimiter,resendVerificationEmail)

userRouter.patch("/api/user", requireAuth, normalizeEmail,
    validateBody({ allowed: ["username", "email", "phone"], validators: { username: validators.username, email: validators.email, phone: validators.phone } }),
    updateUser);
userRouter.post("/api/user/auth/logout", requireAuth, userLogout);
userRouter.delete("/api/user", requireAuth, deleteUser);
