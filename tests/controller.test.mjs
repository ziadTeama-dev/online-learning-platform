import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import bcrypt from "bcrypt";
import { mock } from "node:test";

process.env.NODE_ENV = "test";
process.env.FAWRY_SECURE_KEY = "test-secure-key";
process.env.SALTROUND = "10";

const { createPayment, fawryWebhook, getPaymentStatus } = await import("../src/Controller/Payment.mjs");
const { createUser, getUser } = await import("../src/Controller/User.mjs");
const User = (await import("../src/Model/User.mjs")).default;
const { Course } = await import("../src/Model/Courses.mjs");
const Enrollment = (await import("../src/Model/Enrollement.mjs")).default;
const Payment = (await import("../src/Model/Payment.mjs")).default;

const res = () => ({
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    send() { return this; }
});

const req = (body = {}) => ({ body, user: { id: "507f1f77bcf86cd799439011", _id: "507f1f77bcf86cd799439011", username: "student01", email: "student@example.com", phone: "01012345678" } });

test("registration hashes the password and never returns it", async (t) => {
    let capturedPassword;
    t.mock.method(User, "findOne", () => ({ select: () => ({ lean: async () => null }) }));
    t.mock.method(User, "create", async (data) => ({
        password: capturedPassword = data.password,
        _id: "507f1f77bcf86cd799439012",
        username: data.username,
        email: data.email,
        phone: data.phone,
        role: "student"
    }));
    const response = res();
    await createUser({ body: { username: "alice01", email: "alice@example.com", password: "StrongPass123", phone: "01012345678" } }, response, (e) => { throw e; });
    assert.equal(response.statusCode, 201);
    assert.equal(response.body.data.password, undefined);
    assert.match(capturedPassword, /^\$2[aby]\$/);
    assert.notEqual(capturedPassword, "StrongPass123");
});

test("free-course payment enrolls without calling Fawry", async (t) => {
    t.mock.method(Course, "findOne", () => ({ lean: async () => ({ _id: "507f1f77bcf86cd799439013", price: 0, status: "published" }) }));
    t.mock.method(Enrollment, "findOne", () => ({ select: () => ({ lean: async () => null }) }));
    t.mock.method(Enrollment, "create", async (data) => ({ ...data, _id: "507f1f77bcf86cd799439014" }));
    const response = res();
    await createPayment(req({ courseId: "507f1f77bcf86cd799439013" }), response, (e) => { throw e; });
    assert.equal(response.statusCode, 201);
    assert.equal(response.body.data.payment, null);
});

test("webhook accepts the documented V2 signature and is idempotent", async (t) => {
    const paymentId = "507f1f77bcf86cd799439015";
    const payload = {
        fawryRefNumber: "FAWRY-123",
        merchantRefNum: paymentId,
        paymentAmount: "100.00",
        orderAmount: "100.00",
        orderStatus: "PAID",
        paymentMethod: "PayAtFawry",
        paymentReferenceNumber: "TX-123"
    };
    const signature = crypto.createHash("sha256").update(
        payload.fawryRefNumber + payload.merchantRefNum + payload.paymentAmount + payload.orderAmount + payload.orderStatus + payload.paymentMethod + payload.paymentReferenceNumber + process.env.FAWRY_SECURE_KEY
    ).digest("hex");

    t.mock.method(Payment, "findById", async () => ({ _id: paymentId, user: req().user._id, course: "507f1f77bcf86cd799439016", amount: 100, paymentMethod: "fawry", status: "pending" }));
    t.mock.method(Enrollment, "findOneAndUpdate", async (_q, _u, _o) => ({ _id: "507f1f77bcf86cd799439017" }));
    t.mock.method(Payment, "findOneAndUpdate", async () => ({ _id: paymentId, status: "paid" }));

    const response = res();
    await fawryWebhook({ body: { ...payload, messageSignature: signature } }, response, (e) => { throw e; });
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);

    t.mock.method(Payment, "findById", async () => ({ _id: paymentId, user: req().user._id, course: "507f1f77bcf86cd799439016", amount: 100, paymentMethod: "fawry", status: "paid" }));
    const second = res();
    await fawryWebhook({ body: { ...payload, messageSignature: signature } }, second, (e) => { throw e; });
    assert.equal(second.statusCode, 200);
    assert.match(second.body.message, /already processed/i);
});

test("payment status endpoint only exposes the authenticated user's payment", async (t) => {
    t.mock.method(Payment, "findOne", () => ({ lean: async () => ({ _id: "507f1f77bcf86cd799439018", course: "507f1f77bcf86cd799439019", amount: 120, currency: "EGP", status: "pending", referenceNumber: "REF", paidAt: null }) }));
    const response = res();
    await getPaymentStatus({ params: { paymentId: "507f1f77bcf86cd799439018" }, user: req().user }, response, (e) => { throw e; });
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.data.amount, 120);
    assert.equal(response.body.data.paymentMethod, undefined);
});


test("user endpoint rejects cross-user access before querying the database", async () => {
    const response = res();
    await getUser({ params: { id: "507f1f77bcf86cd799439099" }, user: req().user }, response, (e) => { throw e; });
    assert.equal(response.statusCode, 403);
    assert.equal(response.body.success, false);
});
