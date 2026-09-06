import "dotenv/config";
import express from "express";
import passport from "passport";
import session from "express-session";
import MongoStore from "connect-mongo";
import mongoose from "mongoose";
import { coursesRouter } from "./Routes/CoursesRoute.mjs";
import { logger } from "./Middleware/Logger.mjs";
import { userRouter } from "./Routes/UserRoute.mjs";
import { lessonsRouter } from "./Routes/LessonRoute.mjs";
import paymentsRouter from "./Routes/PaymentRoute.mjs";
import { adminRouter } from "./Routes/AdminRoute.mjs";
import { errorHandler } from "./Middleware/error_catcher.mjs";
import { securityHeaders, corsMiddleware, createRateLimiter } from "./Middleware/security.mjs";
import "./Strategies/localStategy.mjs";

export const createApp = () => {
    const app = express();
    const isProduction = process.env.NODE_ENV === "production";

    app.disable("x-powered-by");
    app.set("trust proxy", process.env.TRUST_PROXY === "true" ? 1 : 0);

    app.use(securityHeaders);
    app.use(corsMiddleware);
    app.use(logger);
    app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "1mb" }));
    app.use(express.urlencoded({ extended: false, limit: process.env.URLENCODED_BODY_LIMIT || "100kb" }));

    const sessionOptions = {
        secret: process.env.SECRET_KEY,
        saveUninitialized: false,
        resave: false,
        proxy: isProduction,
        cookie: {
            httpOnly: true,
            sameSite: isProduction ? "strict" : "lax",
            secure: isProduction,
            maxAge: Number.parseInt(process.env.SESSION_MAX_AGE_MS || "7200000", 10)
        }
    };

    if (!process.env.SECRET_KEY || process.env.SECRET_KEY.length < 32) {
        throw new Error("SECRET_KEY must be at least 32 characters");
    }

    if (process.env.NODE_ENV === "test") {
        sessionOptions.store = new session.MemoryStore();
    } else {
        sessionOptions.store = MongoStore.create({
            mongoUrl: process.env.MONGO_URI,
            collectionName: "sessions",
            ttl: Math.floor(Number.parseInt(process.env.SESSION_MAX_AGE_MS || "7200000", 10) / 1000)
        });
    }

    app.use(session(sessionOptions));
    app.use(passport.initialize());
    app.use(passport.session());

    app.get("/health", async (_req, res) => {
        const dbReady = mongoose.connection.readyState === 1;
        res.status(dbReady ? 200 : 503).json({ success: dbReady, database: dbReady ? "connected" : "disconnected" });
    });
    // global limiter
    app.use(createRateLimiter({
        windowMs: Number(process.env.API_RATE_WINDOW_MS || 60000),
        max: Number(process.env.API_RATE_MAX || 120),
        name: "api"
    }));
    app.use(userRouter);
    app.use(adminRouter);
    app.use(coursesRouter);
    app.use(lessonsRouter);
    app.use("/api/payments", paymentsRouter);

    app.use((_req, res) => res.status(404).json({ success: false, message: "Route not found" }));
    app.use(errorHandler);
    return app;
};

export const app = createApp();
