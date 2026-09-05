import Lesson from "../Model/Lessons.mjs";
import { Course } from "../Model/Courses.mjs";
import Enrollment from "../Model/Enrollement.mjs";
import { uploadVideoToYouTube } from "../Services/youtubeService.mjs";
import fs from "fs/promises";

const extractYoutubeVideoId = (value) => {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    let id;
    if (host === "youtube.com" || host === "www.youtube.com") {
        if (url.pathname === "/watch") id = url.searchParams.get("v");
        else if (url.pathname.startsWith("/shorts/")) id = url.pathname.split("/")[2];
    } else if (host === "youtu.be") {
        id = url.pathname.slice(1).split("/")[0];
    }
    if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) throw new Error("Invalid YouTube URL");
    return id;
};

export const getLessons = async (req, res, next) => {
    try {
        const { courseId } = req.params;
        const course = await Course.findById(courseId).lean();
        if (!course) return res.status(404).json({ success: false, message: "Course not found" });

        const owner = req.user.role === "teacher" && course.teacher.toString() === req.user._id.toString();
        if (course.status !== "published" && !owner) {
            return res.status(404).json({ success: false, message: "Course not found" });
        }
        const enrolled = req.user.role === "student" && await Enrollment.exists({ student: req.user._id, course: courseId });
        const filter = { course: courseId };
        if (!owner && !enrolled) filter.isPreview = true;

        const lessons = await Lesson.find(filter).sort({ order: 1 }).lean();
        return res.status(200).json({ success: true, data: lessons });
    } catch (error) {
        next(error);
    }
};

export const getLesson = async (req, res, next) => {
    try {
        const { courseId, lessonId } = req.params;
        const lesson = await Lesson.findOne({ _id: lessonId, course: courseId }).lean();
        if (!lesson) return res.status(404).json({ success: false, message: "Lesson not found" });

        if (req.user.role !== "teacher") {
            const course = await Course.findOne({ _id: courseId, status: "published" }).select("_id").lean();
            if (!course) return res.status(404).json({ success: false, message: "Course not found" });
            const enrolled = await Enrollment.exists({ student: req.user._id, course: courseId });
            if (!enrolled && !lesson.isPreview) return res.status(403).json({ success: false, message: "Enrollment required" });
        } else {
            const course = await Course.findOne({ _id: courseId, teacher: req.user._id }).select("_id").lean();
            if (!course) return res.status(403).json({ success: false, message: "You are not authorized" });
        }
        return res.status(200).json({ success: true, data: lesson });
    } catch (error) {
        next(error);
    }
};

export const createLesson = async (req, res, next) => {
    const filePath = req.file?.path;
    try {
        const { title, description, duration, order, isPreview, youtubeUrl } = req.body;
        const { courseId } = req.params;

        if ((youtubeUrl && req.file) || (!youtubeUrl && !req.file)) {
            return res.status(400).json({ success: false, message: "Provide exactly one YouTube URL or video file" });
        }

        let videoId;
        if (youtubeUrl) videoId = extractYoutubeVideoId(youtubeUrl);
        if (req.file) {
            const youtubeVideo = await uploadVideoToYouTube({ filePath, title, description, privacyStatus: "private" });
            videoId = youtubeVideo.videoId;
        }

        const lesson = await Lesson.create({ title, description, duration, course: courseId, order, isPreview, videoId });
        return res.status(201).json({ success: true, message: "The lesson has been created successfully", data: lesson });
    } catch (error) {
        next(error);
    } finally {
        if (filePath) {
            try { await fs.unlink(filePath); } catch { /* already removed by upload service */ }
        }
    }
};

export const editLesson = async (req, res, next) => {
    try {
        const { courseId, lessonId } = req.params;
        const lesson = await Lesson.findOne({ _id: lessonId, course: courseId });
        if (!lesson) return res.status(404).json({ success: false, message: "Lesson not found" });
        for (const field of ["title", "description", "duration", "order", "isPreview"]) {
            if (req.body[field] !== undefined) lesson[field] = req.body[field];
        }
        await lesson.save();
        return res.status(200).json({ success: true, message: "The lesson has been updated successfully", data: lesson });
    } catch (error) {
        next(error);
    }
};

export const deleteLesson = async (req, res, next) => {
    try {
        const { courseId, lessonId } = req.params;
        const lesson = await Lesson.findOneAndDelete({ _id: lessonId, course: courseId });
        if (!lesson) return res.status(404).json({ success: false, message: "The lesson was not found" });
        return res.status(204).send();
    } catch (error) {
        next(error);
    }
};
