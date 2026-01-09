import mongoose from "mongoose";

const itemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    price: { type: Number, required: true },
    images: [{ type: String }],
    category: { type: String, required: true },
    description: { type: String, required: true, trim: true },

    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // optional snapshot (so frontend can show seller without populate)
    seller: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      fullName: { type: String },
      profilePic: { type: String },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Item", itemSchema);
