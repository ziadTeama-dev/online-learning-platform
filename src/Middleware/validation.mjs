import mongoose from "mongoose";

const objectId = mongoose.isObjectIdOrHexString;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USERNAME_RE = /^[A-Za-z0-9_.-]{3,30}$/;
const PHONE_RE = /^(?:\+?20|0)?1[0125]\d{8}$/;
const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;

const fail = (res, errors) => res.status(400).json({
    success: false,
    message: "Validation failed",
    errors
});

const isPlainObject = (value) => (
    value !== null && typeof value === "object" && !Array.isArray(value)
);

export const validateBody = ({ allowed = [], required = [], validators = {} } = {}) => {
    return (req, res, next) => {
        const body = req.body;
        const errors = [];

        if (!isPlainObject(body)) {
            return fail(res, [{ field: "body", message: "Request body must be a JSON object" }]);
        }

        const allowedSet = new Set(allowed);
        for (const key of Object.keys(body)) {
            if (!allowedSet.has(key)) {
                errors.push({ field: key, message: "Unexpected field" });
            }
        }

        for (const key of required) {
            if (body[key] === undefined || body[key] === null || body[key] === "") {
                errors.push({ field: key, message: "Field is required" });
            }
        }

        for (const [field, validator] of Object.entries(validators)) {
            if (body[field] === undefined || body[field] === null) continue;
            const error = validator(body[field]);
            if (error) errors.push({ field, message: error });
        }

        return errors.length ? fail(res, errors) : next();
    };
};

export const validateParams = (validators = {}) => {
    return (req, res, next) => {
        const errors = [];
        for (const [field, validator] of Object.entries(validators)) {
            const value = req.params[field];
            if (value === undefined) {
                errors.push({ field, message: "Parameter is required" });
                continue;
            }
            const error = validator(value);
            if (error) errors.push({ field, message: error });
        }
        return errors.length ? fail(res, errors) : next();
    };
};

export const validateQuery = ({ allowed = [], validators = {} } = {}) => {
    return (req, res, next) => {
        const errors = [];
        const allowedSet = new Set(allowed);
        for (const key of Object.keys(req.query)) {
            if (!allowedSet.has(key)) errors.push({ field: key, message: "Unexpected query parameter" });
        }
        for (const [field, validator] of Object.entries(validators)) {
            if (req.query[field] === undefined) continue;
            if (Array.isArray(req.query[field])) {
                errors.push({ field, message: "Parameter must be provided once" });
                continue;
            }
            const error = validator(req.query[field]);
            if (error) errors.push({ field, message: error });
        }
        return errors.length ? fail(res, errors) : next();
    };
};

export const validators = {
    objectId(value) {
        return typeof value === "string" && objectId(value) ? null : "Must be a valid MongoDB ObjectId";
    },
    username(value) {
        return typeof value === "string" && USERNAME_RE.test(value.trim()) ? null : "Must be 3-30 characters using letters, numbers, _, ., or -";
    },
    email(value) {
        return typeof value === "string" && value.length <= 254 && EMAIL_RE.test(value.trim()) ? null : "Must be a valid email address";
    },
    phone(value) {
        return typeof value === "string" && PHONE_RE.test(value.trim()) ? null : "Must be a valid phone number";
    },
    password(value) {
        return typeof value === "string" && value.length >= 8 && value.length <= 128 ? null : "Must be 8-128 characters";
    },
    shortString(max) {
        return (value) => typeof value === "string" && value.trim().length > 0 && value.length <= max ? null : `Must be a non-empty string of at most ${max} characters`;
    },
    string(max) {
        return (value) => typeof value === "string" && value.length <= max ? null : `Must be a string of at most ${max} characters`;
    },
    url(max = 500) {
        return (value) => {
            if (typeof value !== "string" || value.length > max) return "Must be a valid URL";
            try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) ? null : "Must use http or https"; } catch { return "Must be a valid URL"; }
        };
    },
    money(max = 1_000_000_000) {
        return (value) => {
            if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > max) return `Must be a number between 0 and ${max}`;
            return Number.isInteger(value * 100) ? null : "Must have at most two decimal places";
        };
    },
    nonNegativeNumber(max = 1_000_000_000) {
        return (value) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= max ? null : `Must be a number between 0 and ${max}`;
    },
    positiveInt(max = 1_000_000) {
        return (value) => Number.isInteger(value) && value >= 1 && value <= max ? null : `Must be an integer between 1 and ${max}`;
    },
    boolean(value) {
        return typeof value === "boolean" ? null : "Must be a boolean";
    },
    enum(values) {
        return (value) => values.includes(value) ? null : `Must be one of: ${values.join(", ")}`;
    },
    youtubeUrl(value) {
        if (typeof value !== "string" || value.length > 500) return "Must be a valid YouTube URL";
        try {
            const url = new URL(value);
            const host = url.hostname.toLowerCase();
            let id = null;
            if (host === "youtube.com" || host === "www.youtube.com") {
                if (!["/watch", "/shorts"].some((p) => url.pathname === p || url.pathname.startsWith(`${p}/`))) return "Must be a valid YouTube watch URL";
                id = url.searchParams.get("v") || url.pathname.split("/")[2];
            } else if (host === "youtu.be") {
                id = url.pathname.slice(1).split("/")[0];
            } else {
                return "Must be a valid YouTube URL";
            }
            return YOUTUBE_ID_RE.test(id || "") ? null : "Could not extract a valid YouTube video ID";
        } catch {
            return "Must be a valid YouTube URL";
        }
    }
};


export const normalizeMultipartLessonFields = (req, _res, next) => {
    if (!req.is('multipart/form-data')) return next();

    const numericFields = new Set(['duration', 'order']);
    for (const field of numericFields) {
        if (typeof req.body?.[field] === 'string' && req.body[field].trim() !== '') {
            const value = Number(req.body[field]);
            if (Number.isFinite(value)) req.body[field] = value;
        }
    }

    if (typeof req.body?.isPreview === 'string') {
        const value = req.body.isPreview.trim().toLowerCase();
        if (value === 'true') req.body.isPreview = true;
        else if (value === 'false') req.body.isPreview = false;
    }

    next();
};

export const normalizeEmail = (req, _res, next) => {
    if (typeof req.body?.email === "string") req.body.email = req.body.email.trim().toLowerCase();
    if (typeof req.body?.username === "string") req.body.username = req.body.username.trim();
    if (typeof req.body?.phone === "string") req.body.phone = req.body.phone.trim();
    next();
};
