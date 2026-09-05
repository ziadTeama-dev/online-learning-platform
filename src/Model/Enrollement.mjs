import mongoose from "mongoose";

const enrollmentSchema = new mongoose.Schema(
    {
        student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
        payment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", default: null },
        enrolledAt: { type: Date, default: Date.now }
    },
    { timestamps: true, strict: true }
);

enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });
enrollmentSchema.index({ course: 1, createdAt: -1 });

const Enrollment = mongoose.model("Enrollment", enrollmentSchema);
export default Enrollment;
