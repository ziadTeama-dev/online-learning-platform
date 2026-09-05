import { Router } from "express";
import { getCourses, getCourse, createCourse, updateCourse, deleteCourse, getTeacherCourses } from "../Controller/Courses.mjs";
import { requireAuth } from "../Middleware/authencticationMiddleware.mjs";
import { authorize_, isCourseOwner } from "../Middleware/autherizationMiddleware.mjs";
import { validateBody, validateParams, validators } from "../Middleware/validation.mjs";

export const coursesRouter = Router();

coursesRouter.get("/api/courses", getCourses);
coursesRouter.get("/api/teacher/courses", requireAuth, authorize_("teacher"), getTeacherCourses);
coursesRouter.get("/api/courses/:courseId", requireAuth, validateParams({ courseId: validators.objectId }), getCourse);
coursesRouter.post("/api/courses", requireAuth, authorize_("teacher"), validateBody({
    allowed: ["title", "description", "category", "price", "thumbnail", "level", "status"],
    required: ["title", "description", "category", "price"],
    validators: {
        title: validators.shortString(100),
        description: validators.shortString(2000),
        category: validators.shortString(80),
        price: validators.money(100000000),
        thumbnail: validators.url(500),
        level: validators.enum(["beginner", "intermediate", "advanced"]),
        status: validators.enum(["draft", "published"])
    }
}), createCourse);
coursesRouter.patch("/api/courses/:courseId", requireAuth, authorize_("teacher"), validateParams({ courseId: validators.objectId }), validateBody({
    allowed: ["title", "description", "category", "price", "thumbnail", "level", "status"],
    validators: {
        title: validators.shortString(100),
        description: validators.shortString(2000),
        category: validators.shortString(80),
        price: validators.money(100000000),
        thumbnail: validators.url(500),
        level: validators.enum(["beginner", "intermediate", "advanced"]),
        status: validators.enum(["draft", "published"])
    }
}), isCourseOwner, updateCourse);
coursesRouter.delete("/api/courses/:courseId", requireAuth, authorize_("teacher"), validateParams({ courseId: validators.objectId }), isCourseOwner, deleteCourse);
