import multer from "multer";

export const errorHandler = (err, req, res, next) => {
    if (res.headersSent) return next(err);

    const isProduction = process.env.NODE_ENV === "production";
    let status = Number.isInteger(err?.statusCode) ? err.statusCode : 500;
    let message = "Internal server error";
    let errors;

    if (err?.name === "ValidationError") {
        status = 400;
        message = "Validation failed";
        errors = Object.values(err.errors).map((item) => ({ field: item.path, message: item.message }));
    } else if (err?.name === "CastError") {
        status = 400;
        message = "Invalid request parameter";
    } else if (err?.code === 11000) {
        status = 409;
        message = "A resource with the same unique value already exists";
    } else if (err instanceof multer.MulterError) {
        status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
        message = err.code === "LIMIT_FILE_SIZE" ? "Uploaded file is too large" : "Invalid file upload";
    } else if (err?.type === "entity.parse.failed") {
        status = 400;
        message = "Invalid JSON payload";
    } else if (err?.status === 401 || err?.status === 403) {
        status = err.status;
        message = err.message || "Request not authorized";
    }

    if (!isProduction && process.env.EXPOSE_ERRORS === "true") {
        message = err?.message || message;
    }

    const payload = { success: false, message };
    if (errors) payload.errors = errors;
    return res.status(status).json(payload);
};
