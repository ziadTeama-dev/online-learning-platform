import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
        amount: { type: Number, required: true, min: 0, max: 100000000 },
        currency: { type: String, enum: ["EGP"], default: "EGP" },
        status: { type: String, enum: ["pending", "paid", "failed", "refunded"], default: "pending" },
        paymentMethod: { type: String, enum: ["fawry"], default: "fawry" },
        referenceNumber: { type: String, trim: true, maxlength: 100 },
        transactionId: { type: String, trim: true, maxlength: 150 },
        paidAt: { type: Date }
    },
    { timestamps: true, strict: true }
);

paymentSchema.index({ user: 1, course: 1, status: 1 });
paymentSchema.index(
    { user: 1, course: 1 },
    { unique: true, partialFilterExpression: { status: "pending" } }
);
paymentSchema.index({ referenceNumber: 1 }, { unique: true, sparse: true });
paymentSchema.index({ transactionId: 1 }, { unique: true, sparse: true });

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
