import mongoose from "mongoose";
const ref = (model) => ({ type: mongoose.Schema.Types.ObjectId, ref: model });
const schema = new mongoose.Schema(
  {
    userId: { ...ref("User"), required: true },
    eventKey: { type: String, required: true },
    kind: { type: String, enum: ["message"], required: true },
    title: { type: String, required: true },
    body: String,
    url: { type: String, required: true },
    senderId: ref("User"),
    messageId: ref("Message"),
    readAt: { type: Date, default: null },
    dispatchedAt: { type: Date, default: null },
  },
  { timestamps: true }
);
schema.index({ userId: 1, eventKey: 1 }, { unique: true });
schema.index({ userId: 1, createdAt: -1 });
schema.index({ dispatchedAt: 1, createdAt: 1 });
export const ChatAlert = mongoose.model("ChatAlert", schema, "notifications");
const subscription = new mongoose.Schema(
  {
    userId: { ...ref("User"), required: true, index: true },
    endpoint: { type: String, required: true, unique: true, select: false },
    keys: {
      p256dh: { type: String, select: false },
      auth: { type: String, select: false },
    },
  },
  { timestamps: true }
);
export const PushSubscription = mongoose.model(
  "PushSubscription",
  subscription
);
const delivery = new mongoose.Schema(
  {
    notificationId: { ...ref("ChatAlert"), required: true },
    subscriptionId: { ...ref("PushSubscription"), required: true },
    status: {
      type: String,
      enum: ["pending", "sending", "sent", "skipped", "failed"],
      default: "pending",
    },
    attempts: { type: Number, default: 0 },
    nextAttemptAt: { type: Date, default: Date.now },
    leaseUntil: Date,
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);
delivery.index({ notificationId: 1, subscriptionId: 1 }, { unique: true });
delivery.index({ status: 1, nextAttemptAt: 1 });
delivery.index({ expiresAt: 1 }, { expireAfterSeconds: 604800 });
export const PushDelivery = mongoose.model("PushDelivery", delivery);
