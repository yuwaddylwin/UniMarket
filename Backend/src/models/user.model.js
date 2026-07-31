import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: {
        type: String,
        required: true,
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
