import mongoose from "mongoose";

const accommodationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    pricePeriod: {
      type: String,
      required: true,
      enum: ["day", "week", "month", "semester"],
      default: "month",
    },
    description: { type: String, required: true, trim: true },
    accommodationType: { type: String, required: true, trim: true },
    bedrooms: { type: Number, min: 0, default: null },
    contactInfo: { type: String, trim: true, default: "" },
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
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

export default mongoose.model("Accommodation", accommodationSchema);
