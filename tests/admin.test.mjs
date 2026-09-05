import { test } from "node:test";
import assert from "node:assert/strict";
import { updateUserRole } from "../src/Controller/Admin.mjs";
import User from "../src/Model/User.mjs";

const res = () => ({
  statusCode: null,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; }
});

test("user model supports admin while defaulting new users to student", () => {
  const rolePath = User.schema.path("role");
  assert.deepEqual(rolePath.enumValues.sort(), ["admin", "student", "teacher"]);
  assert.equal(rolePath.defaultValue, "student");
  assert.equal(rolePath.options.immutable, undefined);
});

test("admin role controller changes non-admin users only to student/teacher", async (t) => {
  t.mock.method(User, "findById", () => ({
    select: async () => ({
      _id: "507f1f77bcf86cd799439012",
      username: "teacher02",
      email: "teacher02@example.com",
      phone: "01012345671",
      role: "student",
      save: async function () { this.role = "teacher"; }
    })
  }));

  const response = res();
  await updateUserRole(
    { params: { id: "507f1f77bcf86cd799439012" }, body: { role: "teacher" } },
    response,
    (e) => { throw e; }
  );
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.data.role, "teacher");
});

test("admin role controller rejects admin promotion", async () => {
  const response = res();
  await updateUserRole(
    { params: { id: "507f1f77bcf86cd799439012" }, body: { role: "admin" } },
    response,
    (e) => { throw e; }
  );
  assert.equal(response.statusCode, 400);
});
