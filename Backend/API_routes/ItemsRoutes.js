import express from "express";
import Item from "../Models/ItemsList.js";

const router = express.Router();

// Get all items
router.get("/", async (req, res) => {
  try {
    const items = await Item.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: "Error fetching items" });
  }
});

// Post new item
router.post("/", async (req, res) => {
  const { title, price, image, description, user } = req.body;

  try {
    const newItem = new Item({ title, price, image, description, user });
    await newItem.save();
    res.status(201).json(newItem);
  } catch (error) {
    res.status(400).json({ message: "Error posting item" });
  }
});

export default router;
