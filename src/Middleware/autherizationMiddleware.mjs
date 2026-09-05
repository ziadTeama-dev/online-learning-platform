import { Course } from "../Model/Courses.mjs";
import Lesson from "../Model/Lessons.mjs";
// Autherization Middle-ware
export const authorize_ =(role)=>{
   return  (req,res,next)=>{

        if (req.user.role !== role) {
           return  res.status(403).send({
                success : false,
                message : "You are not authorized"
            })
            
        }

        next();

    }
}


export const isCourseOwner = async (req, res, next) => {
    try {
        const courseId = req.params.courseId;
        const teacherId = req.user._id;

        const course = await Course.findOne({
            _id: courseId,
            teacher: teacherId
        });

        if (!course) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized"
            });
        }

        next();

    } catch (error) {
        next(error);
    }
};


export const isLessonOwner = async (req, res, next) => {
    try {
        const { courseId, lessonId } = req.params;
        const teacherId = req.user._id;

        const lesson = await Lesson.findOne({
            _id: lessonId,
            course: courseId
        }).populate("course");

        if (!lesson) {
            return res.status(404).json({
                success: false,
                message: "Lesson not found"
            });
        }

        if (lesson.course.teacher.toString() !== teacherId.toString()) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized"
            });
        }

        next();

    } catch (error) {
        next(error);
    }
};