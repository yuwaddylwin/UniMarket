import mongoose from "mongoose";

const itemSchema = new mongoose.Schema({
  title: String,
  price: Number,
  image: String,
  description: String,
  user: String, 
}, { timestamps: true });

export default mongoose.model("Item", itemSchema);
