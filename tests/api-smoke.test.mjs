import { test, before, after } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
process.env.FAWRY_SECURE_KEY = "test-secure-key";
process.env.SECRET_KEY = "test-secret-key-that-is-long-enough-32-chars";

const { app } = await import("../src/app.mjs");

let server;
let base;

before(async () => {
    server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    await new Promise((resolve) => server.close(resolve));
});

const request = (path, options = {}) => fetch(`${base}${path}`, options);

const cases = [
    ["GET", "/api/user/not-an-id", 401],
    ["POST", "/api/user/auth/login", 400],
    ["POST", "/api/user/auth/register", 400],
    ["PATCH", "/api/user", 401],
    ["POST", "/api/user/auth/logout", 401],
    ["DELETE", "/api/user", 401],
    ["GET", "/api/courses/not-an-id", 401],
    ["POST", "/api/courses", 401],
    ["DELETE", "/api/courses/not-an-id", 401],
    ["GET", "/api/courses/not-an-id/lessons", 401],
    ["GET", "/api/courses/not-an-id/lessons/not-an-id", 401],
    ["POST", "/api/courses/not-an-id/lessons", 401],
    ["PATCH", "/api/courses/not-an-id/lessons/not-an-id", 401],
    ["DELETE", "/api/courses/not-an-id/lessons/not-an-id", 401],
    ["POST", "/api/payments/create", 401],
    ["GET", "/api/payments/not-an-id", 401],
    ["PATCH", "/api/admin/users/not-an-id/role", 401],
    ["POST", "/api/payments/fawry/webhook", 400],
    ["GET", "/does-not-exist", 404]
];

test("all registered API routes have baseline auth/validation behavior", async () => {
    for (const [method, path, expected] of cases) {
        const response = await request(path, {
            method,
            headers: { "content-type": "application/json" },
            body: method === "GET" || method === "DELETE" ? undefined : JSON.stringify({})
        });
        assert.equal(response.status, expected, `${method} ${path}`);
        const body = await response.json();
        assert.equal(typeof body.success, "boolean", `${method} ${path} response shape`);
    }
});

test("health endpoint reports database readiness instead of pretending", async () => {
    const response = await request("/health");
    assert.equal(response.status, 503);
    const body = await response.json();
    assert.equal(body.success, false);
    assert.equal(body.database, "disconnected");
});

test("authentication rate limiter returns 429 after the configured burst", async () => {
    let status;
    for (let i = 0; i < 12; i += 1) {
        const response = await request("/api/user/auth/login", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ username: "x", password: "12345678" })
        });
        status = response.status;
    }
    assert.equal(status, 429);
});

test("validation rejects unexpected fields and malformed IDs", async () => {
    const register = await request("/api/user/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: "abc", email: "a@example.com", password: "12345678", phone: "01012345678", role: "teacher" })
    });
    assert.equal(register.status, 400);
    const registerBody = await register.json();
    assert.equal(registerBody.success, false);
    assert.ok(registerBody.errors.some((item) => item.field === "role"));

    const webhook = await request("/api/payments/fawry/webhook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fawryRefNumber: "F", merchantRefNum: "bad-id", paymentAmount: "1.00", orderAmount: "1.00", orderStatus: "PAID", paymentMethod: "PayAtFawry", messageSignature: "x" })
    });
    assert.equal(webhook.status, 400);
});

test("invalid JSON is rejected consistently", async () => {
    const response = await request("/api/user/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{bad-json"
    });
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.success, false);
});
