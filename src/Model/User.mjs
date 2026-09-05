import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            trim: true,
            unique: true,
            minlength: 3,
            maxlength: 30,
            match: /^[A-Za-z0-9_.-]{3,30}$/
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            maxlength: 254,
            match: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
        },
        phone: {
            type: String,
            required: true,
            trim: true,
            match: /^(?:\+?20|0)?1[0125]\d{8}$/
        },
        password: {
            type: String,
            required: true,
            minlength: 8,
            maxlength: 200,
            select: false
        },
        role: {
            type: String,
            enum: ["teacher", "student", "admin"],
            default: "student"
        }
    },
    {
        timestamps: true,
        strict: true
    }
);


const User = mongoose.model("User", userSchema);
export default User;
