import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true, minlength: 3, maxlength: 100 },
        description: { type: String, required: true, trim: true, minlength: 20, maxlength: 2000 },
        teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, immutable: true },
        category: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
        price: { type: Number, required: true, min: 0, max: 100000000, default: 0 },
        thumbnail: { type: String, default: null, maxlength: 500 },
        level: { type: String, enum: ["beginner", "intermediate", "advanced"], default: "beginner" },
        status: { type: String, enum: ["draft", "published"], default: "draft" },
        students: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        rating: { type: Number, min: 0, max: 5, default: 0 }
    },
    { timestamps: true, strict: true }
);

courseSchema.index({ teacher: 1, createdAt: -1 });
courseSchema.index({ status: 1, createdAt: -1 });
courseSchema.index({ category: 1, status: 1 });

export const Course = mongoose.model("Course", courseSchema);
