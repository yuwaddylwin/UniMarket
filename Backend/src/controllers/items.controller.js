import Item from "../models/Itemlist.model.js";

export const createItem = async (req, res) => {
  try {
    const { title, price, images, category, description, user } = req.body;

    if (!title || !category || !description) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const newItem = await Item.create({
      title,
      price: Number(price),
      images: Array.isArray(images) ? images.slice(0, 6) : [],
      category,
      description,
      user: user || "",
    });

    return res.status(201).json(newItem);
  } catch (err) {
    return res.status(400).json({ message: err.message || "Error creating item" });
  }
};

export const getItems = async (req, res) => {
  try {
    const items = await Item.find().sort({ createdAt: -1 });
    return res.status(200).json(items);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Error fetching items" });
  }
};

export const getItemById = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) return res.status(404).json({ message: "Item not found" });

    return res.status(200).json(item);
  } catch (err) {
    return res.status(400).json({ message: err.message || "Error fetching item" });
  }
};
