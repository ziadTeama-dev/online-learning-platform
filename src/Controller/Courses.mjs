import { Course } from "../Model/Courses.mjs";
import Lesson from "../Model/Lessons.mjs";
import Enrollment from "../Model/Enrollement.mjs";
import Payment from "../Model/Payment.mjs";

const safeCourseQuery = (req) => {
    const filter = {};
    if (req.user?.role === "teacher") filter.teacher = req.user._id;
    else filter.status = "published";
    return filter;
};

export const getCourses = async (req, res, next) => {
    try {
        const filter = safeCourseQuery(req);
        const courses = await Course.find(filter).sort({ createdAt: -1 }).lean();
        return res.status(200).json({ success: true, data: courses });
    } catch (error) {
        next(error);
    }
};

export const getCourse = async (req, res, next) => {
    try {
        const filter = { _id: req.params.courseId };
        if (!(req.user.role === "teacher")) filter.status = "published";
        if (req.user.role === "teacher") filter.$or = [{ teacher: req.user._id }, { status: "published" }];

        const course = await Course.findOne(filter).lean();
        if (!course) return res.status(404).json({ success: false, message: "Course not found" });
        return res.status(200).json({ success: true, data: course });
    } catch (error) {
        next(error);
    }
};

export const createCourse = async (req, res, next) => {
    try {
        const course = await Course.create({
            title: req.body.title,
            description: req.body.description,
            category: req.body.category,
            price: req.body.price,
            thumbnail: req.body.thumbnail ?? null,
            level: req.body.level,
            status: req.body.status,
            teacher: req.user._id
        });
        return res.status(201).json({ success: true, message: "The course has been created", data: course });
    } catch (error) {
        next(error);
    }
};


export const updateCourse = async (req, res, next) => {
    try {
        const allowed = ["title", "description", "category", "price", "thumbnail", "level", "status"];
        const updates = {};
        for (const field of allowed) {
            if (req.body[field] !== undefined) updates[field] = req.body[field];
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ success: false, message: "At least one course field is required" });
        }

        const course = await Course.findOneAndUpdate(
            { _id: req.params.courseId, teacher: req.user._id },
            { $set: updates },
            { new: true, runValidators: true }
        ).lean();

        if (!course) return res.status(404).json({ success: false, message: "Course not found" });
        return res.status(200).json({ success: true, message: "The course has been updated", data: course });
    } catch (error) {
        next(error);
    }
};

export const deleteCourse = async (req, res, next) => {
    try {
        const courseId = req.params.courseId;
        const linkedEnrollment = await Enrollment.exists({ course: courseId });
        const linkedPayment = await Payment.exists({ course: courseId });
        if (linkedEnrollment || linkedPayment) {
            return res.status(409).json({ success: false, message: "Course cannot be deleted after enrollment or payment records exist" });
        }

        const [course] = await Promise.all([
            Course.findOneAndDelete({ _id: courseId, teacher: req.user._id }),
            Lesson.deleteMany({ course: courseId })
        ]);

        if (!course) return res.status(404).json({ success: false, message: "Course not found" });
        return res.status(204).send();
    } catch (error) {
        next(error);
    }
};


export const getTeacherCourses = async (req, res, next) => {
    try {
        const courses = await Course.find({ teacher: req.user._id })
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json({ success: true, data: courses });
    } catch (error) {
        next(error);
    }
};
