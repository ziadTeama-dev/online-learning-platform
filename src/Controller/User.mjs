import User from "../Model/User.mjs";
import { hashPassword } from "../utils/PasswordHash.mjs";
import passport from "passport";
import Enrollment from "../Model/Enrollement.mjs";

const safeUser = (user) => ({
    id: user._id,
    username: user.username,
    email: user.email,
    phone: user.phone,
    role: user.role
});

export const getUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (id !== req.user.id) {
            return res.status(403).json({ success: false, message: "You are not authorized" });
        }

        const user = await User.findById(id).select("-password");
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        return res.status(200).json({ success: true, data: safeUser(user) });
    } catch (error) {
        next(error);
    }
};

export const userLogin = async (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
        if (err) return next(err);
        if (!user) return res.status(401).json({ success: false, message: "Bad credentials" });

        req.session.regenerate((regenerateError) => {
            if (regenerateError) return next(regenerateError);
            req.logIn(user, (loginError) => {
                if (loginError) return next(loginError);
                return res.status(200).json({ success: true, message: "Login successful", data: safeUser(req.user) });
            });
        });
    })(req, res, next);
};

export const createUser = async (req, res, next) => {
    try {
        const { username, email, password, phone } = req.body;

        const existingUser = await User.findOne({ $or: [{ email }, { username }] }).select("_id email username").lean();
        if (existingUser) {
            const field = existingUser.email === email ? "Email" : "Username";
            return res.status(409).json({ success: false, message: `${field} already exists` });
        }

        const hashedPassword = await hashPassword(password);
        const user = await User.create({ username, email, password: hashedPassword, phone });

        return res.status(201).json({
            success: true,
            message: "User has been created successfully",
            data: safeUser(user)
        });
    } catch (error) {
        next(error);
    }
};

export const updateUser = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { username, email, phone } = req.body;
        if (username === undefined && email === undefined && phone === undefined) {
            return res.status(400).json({ success: false, message: "At least one user field is required" });
        }

        const user = await User.findById(userId).select("+password");

        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        if (username !== undefined && username !== user.username) {
            const existing = await User.findOne({ username, _id: { $ne: userId } }).select("_id").lean();
            if (existing) return res.status(409).json({ success: false, message: "Username already exists" });
            user.username = username;
        }
        if (email !== undefined && email !== user.email) {
            const existing = await User.findOne({ email, _id: { $ne: userId } }).select("_id").lean();
            if (existing) return res.status(409).json({ success: false, message: "Email already exists" });
            user.email = email;
        }
        if (phone !== undefined) user.phone = phone;

        await user.save();
        return res.status(200).json({ success: true, message: "User information updated successfully", data: safeUser(user) });
    } catch (error) {
        next(error);
    }
};

export const deleteUser = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const user = await User.findByIdAndDelete(userId);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        req.logout((logoutError) => {
            if (logoutError) return next(logoutError);
            req.session.destroy((sessionError) => {
                if (sessionError) return next(sessionError);
                res.clearCookie("connect.sid", {
                    httpOnly: true,
                    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
                    secure: process.env.NODE_ENV === "production"
                });
                return res.status(204).send();
            });
        });
    } catch (error) {
        next(error);
    }
};

export const userLogout = (req, res, next) => {
    req.logout((logoutError) => {
        if (logoutError) return next(logoutError);
        req.session.destroy((sessionError) => {
            if (sessionError) return next(sessionError);
            res.clearCookie("connect.sid", {
                httpOnly: true,
                sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
                secure: process.env.NODE_ENV === "production"
            });
            return res.status(204).send();
        });
    });
};


export const getStudentCourses = async (req, res, next) => {
    try {
        const enrollments = await Enrollment.find({ student: req.user._id })
            .sort({ enrolledAt: -1 })
            .populate({
                path: "course",
                select: "title description teacher category price thumbnail level status rating createdAt updatedAt"
            })
            .lean();

        const data = enrollments
            .filter((enrollment) => enrollment.course)
            .map((enrollment) => ({
                enrollmentId: enrollment._id,
                enrolledAt: enrollment.enrolledAt,
                payment: enrollment.payment,
                course: enrollment.course
            }));

        return res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};
