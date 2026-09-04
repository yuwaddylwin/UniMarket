import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: {
        type: String,
        required: true,
    },
    username: {
        type: String,
        trim: true,
        lowercase: true,
        minlength: 3,
        maxlength: 30,
        unique: true,
        sparse: true,
    },
    email:{
        type: String,
        required: true,
        unique: true,
    },
    password:{
        type: String,
        required: true,
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
      language: {
        type: String,
        enum: ["en", "th"],
        default: "en",
      },
      messages: {
        type: Boolean,
        default: true,
      },
      notifications: {
        type: Boolean,
        default: true,
      },
    },
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
