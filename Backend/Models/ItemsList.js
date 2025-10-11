import mongoose from "mongoose";

const itemSchema = new mongoose.Schema(
  {
    title: String,
    price: Number,
    image: String,
    description: String,
    user: String,
  },
  { timestamps: true }
);

const Item = mongoose.model("Item", itemSchema);
export default Item;
