import { Router } from "express";
import { updateUserRole } from "../Controller/Admin.mjs";
import { requireAuth } from "../Middleware/authencticationMiddleware.mjs";
import { authorize_ } from "../Middleware/autherizationMiddleware.mjs";
import { validateBody, validateParams, validators } from "../Middleware/validation.mjs";
import { createRateLimiter } from "../Middleware/security.mjs";

export const adminRouter = Router();

const adminLimiter = createRateLimiter({
    windowMs: Number(process.env.ADMIN_RATE_WINDOW_MS || 60000),
    max: Number(process.env.ADMIN_RATE_MAX || 60),
    name: "admin"
});

adminRouter.patch(
    "/api/admin/users/:id/role",
    requireAuth,
    authorize_("admin"),
    adminLimiter,
    validateParams({ id: validators.objectId }),
    validateBody({
        allowed: ["role"],
        required: ["role"],
        validators: { role: validators.enum(["student", "teacher"]) }
    }),
    updateUserRole
);
