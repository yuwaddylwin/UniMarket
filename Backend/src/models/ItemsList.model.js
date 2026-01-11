import mongoose from "mongoose";

const itemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    description: { type: String, required: true, trim: true },
    price: { type: Number, required: true },

    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true }, //  for delete
      },
    ],

    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    seller: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      fullName: String,
      profilePic: String,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Item", itemSchema);
