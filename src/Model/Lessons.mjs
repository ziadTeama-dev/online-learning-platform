import mongoose from "mongoose";

const lessonSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true, minlength: 3, maxlength: 150 },
        description: { type: String, trim: true, maxlength: 1000 },
        videoId: { type: String, required: true, trim: true, maxlength: 32 },
        duration: { type: Number, required: true, min: 0, max: 86400 },
        course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true, immutable: true },
        order: { type: Number, required: true, min: 1, max: 100000 },
        isPreview: { type: Boolean, default: false }
    },
    { timestamps: true, strict: true }
);

lessonSchema.index({ course: 1, order: 1 }, { unique: true });
lessonSchema.index({ course: 1, createdAt: 1 });

const Lesson = mongoose.model("Lesson", lessonSchema);
export default Lesson;
