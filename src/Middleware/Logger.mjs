import pino from "pino";
import pinoHttp from "pino-http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logsDir = path.join(__dirname, "../../logs");

const accessDir = path.join(logsDir, "access");
const errorDir = path.join(logsDir, "error");
const combinedDir = path.join(logsDir, "combined");

for (const dir of [accessDir, errorDir, combinedDir]) {
    fs.mkdirSync(dir, { recursive: true });
}

const getDate = () => {
    return new Date().toISOString().split("T")[0];
};

const createStream = (dir) => {
    return fs.createWriteStream(
        path.join(dir, `${getDate()}.log`),
        { flags: "a" }
    );
};

 const accessLogger = pino(
    { level: "info" },
    createStream(accessDir)
);

 const errorLogger = pino(
    { level: "error" },
    createStream(errorDir)
);

 const combinedLogger = pino(
    { level: "info" },
    createStream(combinedDir)
);

export const logger = pinoHttp({
    logger: combinedLogger,

    customLogLevel(req, res, err) {
        if (err || res.statusCode >= 500) {
            return "error";
        }

        if (res.statusCode >= 400) {
            return "warn";
        }

        return "info";
    },

    customSuccessMessage(req, res) {
        return `${req.method} ${req.url} completed`;
    },

    customErrorMessage(req, res, err) {
        return `${req.method} ${req.url} failed`;
    },

    serializers: {
        req(req) {
            return {
                method: req.method,
                url: req.url,
                ip: req.socket?.remoteAddress,
                userAgent: req.headers["user-agent"]
            };
        },

        res(res) {
            return {
                statusCode: res.statusCode
            };
        }
    }
});

