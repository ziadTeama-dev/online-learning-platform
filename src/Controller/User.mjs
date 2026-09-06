import User from "../Model/User.mjs";
import { hashPassword } from "../utils/PasswordHash.mjs";
import passport from "passport";
import Enrollment from "../Model/Enrollement.mjs";
import { sendVerificationEmail } from "../Services/email.mjs";
import crypto from "crypto"
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
        // create the token
        const token = crypto.randomBytes(32).toString("hex")
        // then hashed it and save it into the db
        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

        const user = await User.create({ username, email, password: hashedPassword, phone , emailVerificationToken : hashedToken , emailVerificationExpires : new Date(Date.now() + 30 * 60 * 1000) });

        await sendVerificationEmail(user.email,token)

        return res.status(201).json({
            success: true,
            message: "User has been created successfully",
            data: safeUser(user)
        });
    } catch (error) {
        next(error);
    }
};

export const verifyUser = async (req,res,next) =>{
    try {
         const {token} = req.query

         if(!token) return  res.status(400).json({
            success: false,
            message: "Verification token is required"
         })

         const hashedToken = crypto.createHash("sha256").update(token).digest("hex")
         
         const user = await User.findOne({
            emailVerificationToken:hashedToken,
            emailVerificationExpires:{$gt: new Date()}

         }).select("+emailVerificationToken +emailVerificationExpires");

         if(!user) return res.status(400).json({
            success:false,
            message:"Invalid or verification token is expired"
         })

         user.emailVerified = true
         user.emailVerificationToken = undefined
         user.emailVerificationExpires = undefined

         await user.save()

        
    } catch (error) {
        next(error)
    }
}



export const resendVerificationEmail = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                message: "Email is required"
            });
        }

        const user = await User.findOne({ email }).select("+lastVerificationEmailSentAt");;


        // Don't reveal whether the email exists
        if (!user) {
        console.log(user)
            return res.status(200).json({
                message:
                    "If the email exists, a verification email has been sent."
            });
        }

        // Already verified
        if (user.emailVerified) {
            return res.status(400).json({
                message: "Email is already verified"
            });
        }

        const now = Date.now();


        if ( user.lastVerificationEmailSentAt && now - user.lastVerificationEmailSentAt.getTime() < 60 * 1000) {

            return res.status(429).json({
                message: "Please wait 60 seconds before requesting another email"
            });
        }

        

        // Generate new raw token
        const rawToken = crypto
            .randomBytes(32)
            .toString("hex");

        // Hash token before storing it
        const hashedToken = crypto
            .createHash("sha256")
            .update(rawToken)
            .digest("hex");

        // Token expires after 30 minutes
        user.emailVerificationToken = hashedToken;

        user.emailVerificationExpires = new Date(
            Date.now() + 30 * 60 * 1000
        );

        user.lastVerificationEmailSentAt = new Date(Date.now());

        await user.save();

        // Send raw token to user's email
        await sendVerificationEmail(
            user.email,
            rawToken
        );

        return res.status(200).json({
            message:
                "If the email exists, a verification email has been sent."
        });

    } catch (error) {
        console.error("Resend verification error:", error);

        return res.status(500).json({
            message: "Failed to resend verification email"
        });
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
