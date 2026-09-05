const buckets = new Map();

const parsePositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const createRateLimiter = ({ windowMs, max, name = "rate-limit" }) => {
    const window = parsePositiveInt(windowMs, 60_000);
    const limit = parsePositiveInt(max, 100);

    return (req, res, next) => {
        const key = `${name}:${req.ip}`;
        const now = Date.now();
        const current = buckets.get(key);
        const record = !current || current.resetAt <= now
            ? { count: 0, resetAt: now + window }
            : current;

        record.count += 1;
        buckets.set(key, record);

        if (record.count > limit) {
            res.set("Retry-After", String(Math.max(1, Math.ceil((record.resetAt - now) / 1000))));
            return res.status(429).json({
                success: false,
                message: "Too many requests"
            });
        }

        return next();
    };
};

setInterval(() => {
    const now = Date.now();
    for (const [key, record] of buckets) {
        if (record.resetAt <= now) buckets.delete(key);
    }
}, 60_000).unref();

export const securityHeaders = (req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader("X-DNS-Prefetch-Control", "off");
    if (process.env.NODE_ENV === "production") {
        res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
    next();
};

export const corsMiddleware = (req, res, next) => {
    const origin = req.headers.origin;
    const configured = (process.env.CORS_ORIGIN || "").split(",").map((v) => v.trim()).filter(Boolean);

    if (origin && configured.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Credentials", "true");
        res.setHeader("Vary", "Origin");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Requested-With");
        res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
    }

    if (req.method === "OPTIONS") return res.sendStatus(origin && configured.includes(origin) ? 204 : 403);
    next();
};
