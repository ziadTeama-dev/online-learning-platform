import { test } from "node:test";
import assert from "node:assert/strict";
import { validators } from "../src/Middleware/validation.mjs";
import { normalizeMultipartLessonFields } from "../src/Middleware/validation.mjs";
import { Course } from "../src/Model/Courses.mjs";
import Lesson from "../src/Model/Lessons.mjs";
import Enrollment from "../src/Model/Enrollement.mjs";
import { getLessons, getLesson } from "../src/Controller/Lessons.mjs";
import { createPayment } from "../src/Controller/Payment.mjs";

const res = () => ({
  statusCode: null,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; }
});

const teacherReq = (params = {}, body = {}) => ({ params, body, user: { _id: "507f1f77bcf86cd799439011", id: "507f1f77bcf86cd799439011", role: "teacher" } });
const studentReq = (params = {}, body = {}) => ({ params, body, user: { _id: "507f1f77bcf86cd799439012", id: "507f1f77bcf86cd799439012", role: "student" } });

test("validation rejects oversized strings and unsafe URLs", () => {
  assert.equal(validators.shortString(5)("123456"), "Must be a non-empty string of at most 5 characters");
  assert.equal(validators.url(100)("javascript:alert(1)"), "Must use http or https");
  assert.equal(validators.youtubeUrl("https://example.com/video"), "Must be a valid YouTube URL");
});

test("multipart lesson field normalization coerces types", () => {
  const req = { body: { duration: "600", order: "1", isPreview: "false" }, is: () => true };
  normalizeMultipartLessonFields(req, {}, () => {});
  assert.equal(req.body.duration, 600);
  assert.equal(req.body.order, 1);
  assert.equal(req.body.isPreview, false);
});

test("draft course lessons are not exposed to non-owner users", async (t) => {
  t.mock.method(Course, "findById", () => ({ lean: async () => ({ _id: "507f1f77bcf86cd799439013", status: "draft", teacher: "507f1f77bcf86cd799439099" }) }));
  const response = res();
  await getLessons(studentReq({ courseId: "507f1f77bcf86cd799439013" }), response, (e) => { throw e; });
  assert.equal(response.statusCode, 404);
});

test("create payment reports missing provider configuration instead of 500", async (t) => {
  const prior = process.env.FAWRY_MERCHANT_CODE;
  delete process.env.FAWRY_MERCHANT_CODE;
  t.mock.method(Course, "findOne", () => ({ lean: async () => ({ _id: "507f1f77bcf86cd799439014", price: 100, status: "published" }) }));
  t.mock.method(Enrollment, "findOne", () => ({ select: () => ({ lean: async () => null }) }));
  const response = res();
  await createPayment(studentReq({}, { courseId: "507f1f77bcf86cd799439014" }), response, (e) => { throw e; });
  assert.equal(response.statusCode, 503);
  assert.equal(response.body.message, "Payment provider is not configured");
  if (prior === undefined) delete process.env.FAWRY_MERCHANT_CODE; else process.env.FAWRY_MERCHANT_CODE = prior;
});
