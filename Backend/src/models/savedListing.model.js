import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    listingType: {
      type: String,
      enum: ["item", "accommodation"],
      required: true,
    },
    listingId: { type: mongoose.Schema.Types.ObjectId, required: true },
  },
  { timestamps: true }
);
schema.index({ user: 1, listingType: 1, listingId: 1 }, { unique: true });
export default mongoose.model("SavedListing", schema);
