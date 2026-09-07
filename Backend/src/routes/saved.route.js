import express from "express";
import mongoose from "mongoose";
import SavedListing from "../models/savedListing.model.js";
import Item from "../models/ItemsList.model.js";
import Accommodation from "../models/Accommodation.model.js";
import { ProtectRoute } from "../middleware/auth.middleware.js";
import { visibleListing } from "../services/moderationPolicy.js";

const router = express.Router();
const models = { item: Item, accommodation: Accommodation };
const publicFields = "title price pricePeriod images seller user status location";
router.use(ProtectRoute);
router.get("/", async (req, res, next) => {
  try {
    const saved = await SavedListing.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();
    const groups = await Promise.all(Object.entries(models).map(async ([type, Model]) => {
      const ids = saved.filter(entry => entry.listingType === type).map(entry => entry.listingId);
      const listings = await Model.find({ _id: { $in: ids }, ...visibleListing }).select(publicFields).lean();
      return listings.map(listing => [`${type}:${listing._id}`, listing]);
    }));
    const byId = new Map(groups.flat());
    res.json(saved.map(entry => ({ ...entry, listing: byId.get(`${entry.listingType}:${entry.listingId}`) || null })));
  } catch (error) { next(error); }
});
router.param("listingType", (req, res, next, type) => {
  if (!Object.hasOwn(models, type)) return res.status(400).json({ message: "Invalid listing type" });
  next();
});
router.param("listingId", (req, res, next, id) => {
  if (!mongoose.isObjectIdOrHexString(id)) return res.status(400).json({ message: "Invalid listing ID" });
  next();
});
router.put("/:listingType/:listingId", async (req, res, next) => {
  try {
    const { listingType, listingId } = req.params;
    const listing = await models[listingType].findOne({ _id: listingId, ...visibleListing }).select(publicFields).lean();
    if (!listing) return res.status(404).json({ message: "Listing is no longer available" });
    const key = { user: req.user._id, listingType, listingId };
    let entry;
    try {
      entry = await SavedListing.findOneAndUpdate(key, { $setOnInsert: key }, { upsert: true, new: true }).lean();
    } catch (error) {
      if (error.code !== 11000) throw error;
      entry = await SavedListing.findOne(key).lean();
    }
    res.json({ ...entry, listing });
  } catch (error) { next(error); }
});
router.delete("/:listingType/:listingId", async (req, res, next) => {
  try {
    await SavedListing.deleteOne({ user: req.user._id, listingType: req.params.listingType, listingId: req.params.listingId });
    res.sendStatus(204);
  } catch (error) { next(error); }
});
export default router;
