import { Course } from "../Model/Courses.mjs";
import Payment from "../Model/Payment.mjs";
import { createFawryReferencePayment } from "../Services/Fawry.mjs";
import crypto from "crypto";
import Enrollment from "../Model/Enrollement.mjs";

const formatAmount = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number.toFixed(2) : null;
};

const safeEqualHex = (expected, actual) => {
    if (typeof expected !== "string" || typeof actual !== "string" || !/^[a-f0-9]{64}$/i.test(actual)) return false;
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(actual, "hex");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const getWebhookSignature = ({ fawryRefNumber, merchantRefNum, paymentAmount, orderAmount, orderStatus, paymentMethod, paymentReferenceNumber, secureKey }) =>
    crypto.createHash("sha256")
        .update(
            String(fawryRefNumber || "") +
            String(merchantRefNum || "") +
            String(paymentAmount) +
            String(orderAmount) +
            String(orderStatus || "") +
            String(paymentMethod || "") +
            String(paymentReferenceNumber || "") +
            secureKey
        )
        .digest("hex");

export const createPayment = async (req, res, next) => {
    try {
        const course = await Course.findOne({ _id: req.body.courseId, status: "published" }).lean().read("primary");
        if (!course) return res.status(404).json({ success: false, message: "Course not found" });

        const existingEnrollment = await Enrollment.findOne({ student: req.user._id, course: course._id }).select("_id").lean().read("primary");
        if (existingEnrollment) return res.status(409).json({ success: false, message: "You are already enrolled in this course" });

        const amount = Number(course.price);
        if (amount === 0) {
            try {
                const enrollment = await Enrollment.create({ student: req.user._id, course: course._id, payment: null });
                return res.status(201).json({ success: true, message: "You have been enrolled in the course successfully", data: enrollment });
            } catch (error) {
                if (error?.code === 11000) return res.status(409).json({ success: false, message: "You are already enrolled in this course" });
                throw error;
            }
        }

        const missingFawryConfig = [
            "FAWRY_MERCHANT_CODE",
            "FAWRY_SECURE_KEY",
            "FAWRY_PAYMENT_URL",
            "FAWRY_WEBHOOK_URL"
        ].filter((key) => !process.env[key]);
        if (missingFawryConfig.length) {
            return res.status(503).json({ success: false, message: "Payment provider is not configured" });
        }

        const payment = await Payment.create({
            user: req.user._id,
            course: course._id,
            amount,
            currency: "EGP",
            paymentMethod: "fawry",
            status: "pending"
        });

        try {
            const fawryResponse = await createFawryReferencePayment({
                merchantRefNum: payment._id.toString(),
                customerProfileId: req.user.id.toString(),
                customerName: req.user.username,
                customerMobile: req.user.phone,
                customerEmail: req.user.email,
                amount,
                courseId: course._id,
                courseName: course.title
            });

            if (!fawryResponse?.referenceNumber) throw new Error("Fawry did not return a reference number");
            payment.referenceNumber = String(fawryResponse.referenceNumber);
            await payment.save();
        } catch (error) {
            await Payment.findByIdAndUpdate(payment._id, { status: "failed" }).catch(() => {});
            throw error;
        }

        return res.status(201).json({
            success: true,
            message: "Payment created successfully",
            data: {
                paymentId: payment._id,
                amount: payment.amount,
                referenceNumber: payment.referenceNumber,
                status: payment.status
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getPaymentStatus = async (req, res, next) => {
    try {
        const payment = await Payment.findOne({ _id: req.params.paymentId, user: req.user._id }).lean().read("primary");
        if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });
        return res.status(200).json({ success: true, data: { paymentId: payment._id, courseId: payment.course, amount: payment.amount, currency: payment.currency, status: payment.status, referenceNumber: payment.referenceNumber ?? null, paidAt: payment.paidAt ?? null } });
    } catch (error) {
        next(error);
    }
};

export const fawryWebhook = async (req, res, next) => {
    try {
        const {
            fawryRefNumber,
            merchantRefNum,
            paymentAmount,
            orderAmount,
            orderStatus,
            paymentMethod,
            paymentReferenceNumber,
            messageSignature
        } = req.body;

        const secureKey = process.env.FAWRY_SECURE_KEY;
        if (!secureKey) return res.status(503).json({ success: false, message: "Payment provider is not configured" });

        const paymentAmountFormatted = formatAmount(paymentAmount);
        const orderAmountFormatted = formatAmount(orderAmount);
        if (!merchantRefNum || !fawryRefNumber || !paymentAmountFormatted || !orderAmountFormatted || !orderStatus || !paymentMethod || !messageSignature) {
            return res.status(400).json({ success: false, message: "Invalid webhook payload" });
        }

        const payment = await Payment.findById(merchantRefNum).read("primary");
        if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });

        const calculatedSignature = getWebhookSignature({
            fawryRefNumber,
            merchantRefNum,
            paymentAmount: paymentAmountFormatted,
            orderAmount: orderAmountFormatted,
            orderStatus,
            paymentMethod,
            paymentReferenceNumber,
            secureKey
        });

        if (!safeEqualHex(calculatedSignature, messageSignature)) {
            return res.status(400).json({ success: false, message: "Invalid signature" });
        }

        const normalizedPaymentMethod = paymentMethod.toLowerCase() === "payatfawry" ? "fawry" : paymentMethod.toLowerCase();
        if (normalizedPaymentMethod !== payment.paymentMethod) {
            return res.status(400).json({ success: false, message: "Payment method mismatch" });
        }

        if (Number(orderAmountFormatted) !== Number(payment.amount) || Number(paymentAmountFormatted) !== Number(payment.amount)) {
            return res.status(400).json({ success: false, message: "Payment amount mismatch" });
        }

        if (orderStatus === "PAID") {
            if (payment.status === "paid") return res.status(200).json({ success: true, message: "Payment already processed" });
            if (payment.status !== "pending") return res.status(409).json({ success: false, message: "Payment is not payable" });

            await Enrollment.findOneAndUpdate(
                { student: payment.user, course: payment.course },
                { $setOnInsert: { student: payment.user, course: payment.course, payment: payment._id } },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            const updated = await Payment.findOneAndUpdate(
                { _id: payment._id, status: "pending" },
                {
                    $set: {
                        status: "paid",
                        referenceNumber: String(fawryRefNumber),
                        transactionId: paymentReferenceNumber ? String(paymentReferenceNumber) : undefined,
                        paidAt: new Date()
                    }
                },
                { new: true }
            );

            if (!updated) return res.status(200).json({ success: true, message: "Payment already processed" });
            return res.status(200).json({ success: true, message: "Payment processed successfully" });
        }

        if (["EXPIRED", "CANCELED", "CANCELLED"].includes(orderStatus)) {
            await Payment.findOneAndUpdate(
                { _id: payment._id, status: "pending" },
                { $set: { status: "failed" } }
            );
            return res.status(200).json({ success: true, message: "Payment status updated" });
        }

        return res.status(200).json({ success: true, message: "Webhook received" });
    } catch (error) {
        next(error);
    }
};
