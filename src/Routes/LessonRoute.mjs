import { Router } from "express";
import { getLessons, createLesson, editLesson, deleteLesson, getLesson } from "../Controller/Lessons.mjs";
import { requireAuth } from "../Middleware/authencticationMiddleware.mjs";
import { authorize_, isCourseOwner, isLessonOwner } from "../Middleware/autherizationMiddleware.mjs";
import { uploadVideo, cleanupUploadedFile } from "../Middleware/upload.mjs";
import { validateBody, validateParams, validators, normalizeMultipartLessonFields } from "../Middleware/validation.mjs";

export const lessonsRouter = Router();

const lessonParams = validateParams({ courseId: validators.objectId });
const singleLessonParams = validateParams({ courseId: validators.objectId, lessonId: validators.objectId });
const createLessonValidation = validateBody({
    allowed: ["title", "description", "duration", "order", "isPreview", "youtubeUrl"],
    required: ["title", "description", "duration", "order"],
    validators: {
        title: validators.shortString(150),
        description: validators.string(1000),
        duration: validators.nonNegativeNumber(86400),
        order: validators.positiveInt(100000),
        isPreview: validators.boolean,
        youtubeUrl: validators.youtubeUrl
    }
});

const editLessonValidation = validateBody({
    allowed: ["title", "description", "duration", "order", "isPreview"],
    validators: {
        title: validators.shortString(150),
        description: validators.string(1000),
        duration: validators.nonNegativeNumber(86400),
        order: validators.positiveInt(100000),
        isPreview: validators.boolean
    }
});

lessonsRouter.get("/api/courses/:courseId/lessons", requireAuth, lessonParams, getLessons);
lessonsRouter.get("/api/courses/:courseId/lessons/:lessonId", requireAuth, singleLessonParams, getLesson);
lessonsRouter.post("/api/courses/:courseId/lessons", requireAuth, authorize_("teacher"), lessonParams,
    isCourseOwner, uploadVideo.single("video"), cleanupUploadedFile, normalizeMultipartLessonFields, createLessonValidation, createLesson);
lessonsRouter.patch("/api/courses/:courseId/lessons/:lessonId", requireAuth, authorize_("teacher"), singleLessonParams,
    isLessonOwner, editLessonValidation, editLesson);
lessonsRouter.delete("/api/courses/:courseId/lessons/:lessonId", requireAuth, authorize_("teacher"), singleLessonParams,
    isLessonOwner, deleteLesson);
