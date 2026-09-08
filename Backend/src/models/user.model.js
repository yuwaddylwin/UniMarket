import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["user", "admin"], default: "user", index: true },
    warningCount: { type: Number, default: 0 },
    restriction: {
      status: { type: String, enum: ["active", "frozen", "suspended"], default: "active" },
      until: Date, reason: String,
    },
    fullName: {
        type: String,
        required: true,
    },
    username: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        minlength: 3,
        maxlength: 30,
        unique: true,
        sparse: true,
        immutable: true,
        match: /^[a-z0-9_]{3,30}$/,
    },
    googleSub: { type: String, unique: true, sparse: true, select: false },
    sessionVersion: { type: Number, default: 0, select: false },
    email:{
        type: String,
        required: true,
        unique: true,
    },
    password:{
        type: String,
        required: function () { return !this.googleSub; },
        select: false,
        minlength: 6,
    },
    profilePic:{
        type: String,
        default: "",
    },
    profilePicPublicId: {
        type: String,
        default: "",
        select: false,
    },
    preferences: {
      browserPush: { type: Boolean, default: false },
      language: {
        type: String,
        enum: ["en", "th"],
        default: "en",
      },
      messages: {
        type: Boolean,
        default: true,
      },
    },
    chatRevision: { type: Number, default: 0, select: false },
    blockedUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
    verified: {
        type: Boolean,
        default: false,
    },
    verificationToken: {
        type: String,
        default: null,
        select: false,
        index: true,
    },
    verificationTokenExpires: {
        type: Date,
        default: null,
        select: false,
    }
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
