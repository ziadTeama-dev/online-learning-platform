import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";

const uploadPath = path.resolve(process.env.UPLOAD_DIR || "uploads/videos");
const allowedMimeTypes = new Set([
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/x-matroska",
    "video/x-msvideo",
    "video/mpeg"
]);
const allowedExtensions = new Set([".mp4", ".webm", ".mov", ".mkv", ".avi", ".mpeg", ".mpg"]);

fs.mkdirSync(uploadPath, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadPath),
    filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`)
});

const fileFilter = (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedMimeTypes.has(file.mimetype) && allowedExtensions.has(ext)) return cb(null, true);
    return cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "video"));
};

export const uploadVideo = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: Number.parseInt(process.env.MAX_VIDEO_UPLOAD_BYTES || "524288000", 10),
        files: 1,
        fields: 10,
        parts: 11
    }
});

export { uploadPath };

export const cleanupUploadedFile = (req, res, next) => {
    if (!req.file?.path) return next();
    res.once("finish", () => { fs.promises.unlink(req.file.path).catch(() => {}); });
    res.once("close", () => { fs.promises.unlink(req.file.path).catch(() => {}); });
    next();
};
