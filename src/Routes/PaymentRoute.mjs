import express from "express";
import { requireAuth } from "../Middleware/authencticationMiddleware.mjs";
import { createPayment, getPaymentStatus, fawryWebhook } from "../Controller/Payment.mjs";
import { authorize_ } from "../Middleware/autherizationMiddleware.mjs";
import { createRateLimiter } from "../Middleware/security.mjs";
import { validateBody, validateParams, validators } from "../Middleware/validation.mjs";

const paymentsRouter = express.Router();
const paymentLimiter = createRateLimiter({ windowMs: Number(process.env.PAYMENT_RATE_WINDOW_MS || 60000), max: Number(process.env.PAYMENT_RATE_MAX || 5), name: "payment" });
const paymentIdValidation = validateParams({ paymentId: validators.objectId });
const webhookLimiter = createRateLimiter({ windowMs: Number(process.env.WEBHOOK_RATE_WINDOW_MS || 60000), max: Number(process.env.WEBHOOK_RATE_MAX || 30), name: "webhook" });

paymentsRouter.post(
    "/create",
    requireAuth,
    authorize_("student"),
    paymentLimiter,
    validateBody({ allowed: ["courseId"], required: ["courseId"], validators: { courseId: validators.objectId } }),
    createPayment
);

paymentsRouter.get("/:paymentId", requireAuth, paymentIdValidation, getPaymentStatus);

paymentsRouter.post("/fawry/webhook", webhookLimiter, validateBody({
    allowed: ["fawryRefNumber", "merchantRefNum", "paymentAmount", "orderAmount", "orderStatus", "paymentMethod", "paymentReferenceNumber", "messageSignature"],
    required: ["fawryRefNumber", "merchantRefNum", "paymentAmount", "orderAmount", "orderStatus", "paymentMethod", "messageSignature"],
    validators: {
        fawryRefNumber: validators.shortString(100),
        merchantRefNum: validators.objectId,
        paymentAmount: (v) => formatWebhookAmount(v),
        orderAmount: (v) => formatWebhookAmount(v),
        orderStatus: validators.enum(["PAID", "EXPIRED", "CANCELED", "CANCELLED"]),
        paymentMethod: validators.enum(["fawry", "PayAtFawry", "PayUsingCC", "CARD", "MWALLET", "CASHONDELIVERY", "VALU"]),
        paymentReferenceNumber: validators.string(150),
        messageSignature: (v) => typeof v === "string" && /^[a-f0-9]{64}$/i.test(v) ? null : "Must be a SHA-256 hexadecimal signature"
    }
}), fawryWebhook);

function formatWebhookAmount(value) {
    if (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100000000) return null;
    if (typeof value === "string" && /^\d+(?:\.\d{1,2})?$/.test(value) && Number(value) <= 100000000) return null;
    return "Must be a valid non-negative monetary amount";
}

export default paymentsRouter;
