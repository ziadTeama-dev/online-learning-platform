import "dotenv/config";
import mongoose from "mongoose";
import User from "../src/Model/User.mjs";
import { hashPassword } from "../src/utils/PasswordHash.mjs";
import { connectDb } from "../src/Config/db.mjs";

const required = ["ADMIN_USERNAME", "ADMIN_EMAIL", "ADMIN_PASSWORD", "ADMIN_PHONE"];
for (const key of required) {
    if (!process.env[key]) throw new Error(`${key} is required`);
}
if (process.env.ADMIN_PASSWORD.length < 8) throw new Error("ADMIN_PASSWORD must be at least 8 characters");

await connectDb();
const username = process.env.ADMIN_USERNAME.trim();
const email = process.env.ADMIN_EMAIL.trim().toLowerCase();
const phone = process.env.ADMIN_PHONE.trim();

const existing = await User.findOne({ $or: [{ username }, { email }] });
if (existing) {
    existing.role = "admin";
    if (process.env.ADMIN_RESET_PASSWORD === "true") existing.password = await hashPassword(process.env.ADMIN_PASSWORD);
    await existing.save();
    console.log(`Admin role ensured for ${existing.username}`);
} else {
    const password = await hashPassword(process.env.ADMIN_PASSWORD);
    const admin = await User.create({ username, email, phone, password, role: "admin" });
    console.log(`Admin created: ${admin.username}`);
}

await mongoose.disconnect();
