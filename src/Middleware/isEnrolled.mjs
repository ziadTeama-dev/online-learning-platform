import Enrollment from "../Model/Enrollement.mjs";

export const isEnrolled = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const { courseId } = req.params;

    const enrollment = await Enrollment.findOne({
      student: studentId,
      course: courseId,
      
    }).read("primary");

    if (!enrollment) {
      return res.status(403).json({
        message: "You have not purchased this course",
      });
    }

    next();

  } catch (error) {
    console.error("isEnrolled Error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};