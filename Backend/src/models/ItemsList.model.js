import mongoose from "mongoose";

const itemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    price: { type: Number, required: true },
    images: [{ type: String }],     //  multiple
    category: { type: String, required: true },
    description: { type: String, required: true },
    user: { type: String },         // or ObjectId ref if you have auth
  },
  { timestamps: true }
);

const Item = mongoose.model("Item", itemSchema);
export default Item;








// import mongoose from "mongoose";

// const itemSchema = new mongoose.Schema(
//   {
//     title: String,
//     price: Number,
//     image: String,
//     description: String,
//     user: String,
//   },
//   { timestamps: true }
// );

// const Item = mongoose.model("Item", itemSchema);
// export default Item;
