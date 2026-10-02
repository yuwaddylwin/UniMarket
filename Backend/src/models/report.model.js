import mongoose from "mongoose";
export const reportReasons = [
  "Scam / Fraud",
  "Harassment",
  "Spam",
  "Inappropriate content",
  "Fake listing",
  "Prohibited item",
  "Misleading information",
  "Suspicious behavior",
  "Other",
];
const ref = (model) => ({ type: mongoose.Schema.Types.ObjectId, ref: model });
const schema = new mongoose.Schema(
  {
    reporterId: { ...ref("User"), required: true },
    reportedId: { ...ref("User"), required: true },
    targetKind: {
      type: String,
      enum: ["user", "item", "accommodation", "message"],
      default: "user",
    },
    targetKey: { type: String, required: true },
    reportedListingId: mongoose.Schema.Types.ObjectId,
    reportedMessageId: ref("Message"),
    conversationId: String,
    reason: { type: String, required: true, maxlength: 2000 },
    description: { type: String, maxlength: 2000, default: "" },
    status: {
      type: String,
      enum: ["pending", "reviewed", "under_review", "resolved", "dismissed"],
      default: "pending",
    },
    open: { type: Boolean, default: true },
    adminNote: { type: String, maxlength: 2000, default: "" },
    resolvedAt: Date,
    resolvedBy: ref("User"),
  },
  { timestamps: true, autoIndex: false }
);
schema.index(
  { reporterId: 1, targetKey: 1 },
  {
    unique: true,
    partialFilterExpression: { open: true, targetKey: { $type: "string" } },
  }
);
schema.index({ status: 1, createdAt: -1 });
schema.index({ reportedListingId: 1, targetKind: 1 });
schema.index({ reportedId: 1, createdAt: -1 });
export default mongoose.model("UserReport", schema);
