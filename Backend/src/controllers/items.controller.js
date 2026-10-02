import { visibleListing } from "../services/moderationPolicy.js";
import Item from "../models/ItemsList.model.js";
import cloudinary from "../lib/cloudinary.js";
import {
  buildSellerSnapshot,
  hasValidId,
  sendControllerError,
  parseMaybeJson,
} from "../services/listingHelpers.js";
import { uploadBufferToCloudinary } from "../lib/cloudinaryUpload.js";

function normalizeImages(images) {
  if (!Array.isArray(images)) return [];
  return images
    .map((img) => {
      if (!img) return null;

      // if user sends string URL, publicId may be missing
      if (typeof img === "string") {
        return { url: img, publicId: "" };
      }

      const url = img?.url;
      const publicId = img?.publicId || "";

      if (!url) return null;
      return { url, publicId };
    })
    .filter(Boolean)
    .slice(0, 6);
}

function normalizeItem(item) {
  const user = item.user && typeof item.user === "object" ? item.user : null;
  const seller = user
    ? buildSellerSnapshot(user)
    : item.seller?.fullName || item.seller?.profilePic || item.seller?.id
      ? item.seller
      : null;

  return { ...item, seller };
}

export const createItem = async (req, res) => {
  const uploadedImages = [];
  try {
    const title = (req.body.title ?? req.body.name ?? "").trim();
    const category = (req.body.category ?? "").trim();
    const description = (req.body.description ?? "").trim();
    const price = req.body.price;

    const requiredFields = [
      ["Title", title],
      ["Category", category],
      ["Description", description],
      ["Price", price],
    ];
    const missingField = requiredFields.find(
      ([, value]) =>
        value === undefined ||
        value === null ||
        (typeof value === "string" && value.trim() === "")
    );

    if (missingField) {
      return res.status(400).json({
        success: false,
        message: `${missingField[0]} is required`,
      });
    }

    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice)) {
      return res.status(400).json({
        success: false,
        message: "Price must be a valid number",
      });
    }

    if (numericPrice < 0) {
      return res.status(400).json({
        success: false,
        message: "Price must be greater than or equal to 0",
      });
    }

    if (!Number.isInteger(numericPrice)) {
      return res.status(400).json({
        success: false,
        message: "Price must be a whole number",
      });
    }

    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!req.files?.length) {
      return res.status(400).json({
        success: false,
        message: "At least 1 image is required",
      });
    }

    for (const file of req.files || []) {
      const result = await uploadBufferToCloudinary(file.buffer, "items");
      uploadedImages.push({
        url: result.secure_url,
        publicId: result.public_id,
      });
    }

    const newItem = await Item.create({
      title,
      price: numericPrice,
      images: uploadedImages.slice(0, 6),
      category,
      description,
      user: req.user._id,
      seller: buildSellerSnapshot(req.user),
    });

    return res.status(201).json(newItem);
  } catch (err) {
    for (const image of uploadedImages) {
      if (image.publicId)
        await cloudinary.uploader.destroy(image.publicId).catch(() => {});
    }
    if (err?.name === "ValidationError") {
      return res.status(400).json({ success: false, message: err.message });
    }
    console.error("Error creating item:", err);
    return res
      .status(500)
      .json({ success: false, message: "Error creating item" });
  }
};

export const getItems = async (req, res) => {
  try {
    const items = await Item.find({
      ...visibleListing,
      status: { $ne: "sold" },
    })
      .sort({ createdAt: -1 })
      .populate("user", "fullName username name profilePic avatar photo")
      .lean();

    const normalized = items.map(normalizeItem);

    return res.status(200).json(normalized);
  } catch (err) {
    console.error("Error fetching items", err);
    return res.status(500).json({ message: "Error fetching items" });
  }
};

export const getMyItems = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const items = await Item.find({
      user: req.user._id,
      status: { $ne: "sold" },
    })
      .sort({ createdAt: -1 })
      .populate("user", "fullName username name profilePic avatar photo")
      .lean();

    const normalized = items.map(normalizeItem);

    return res.status(200).json(normalized);
  } catch (err) {
    console.error("Error fetching my items", err);
    return res.status(500).json({ message: "Error fetching my items" });
  }
};

export const getItemById = async (req, res) => {
  try {
    if (!hasValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid item id" });
    }
    const item = await Item.findOne({
      ...visibleListing,
      _id: req.params.id,
      status: { $ne: "sold" },
    })
      .populate("user", "fullName username name profilePic avatar photo")
      .lean();

    if (!item) return res.status(404).json({ message: "Item not found" });

    return res.status(200).json(normalizeItem(item));
  } catch (err) {
    return sendControllerError(res, err, "Error fetching item");
  }
};

export const getMyArchivedItems = async (req, res) => {
  try {
    if (!req.user?._id)
      return res.status(401).json({ message: "Unauthorized" });
    const items = await Item.find({ user: req.user._id, status: "sold" })
      .sort({ soldAt: -1, updatedAt: -1 })
      .populate("user", "fullName username name profilePic avatar photo")
      .lean();
    return res.status(200).json(
      items.map((item) => {
        const user =
          item.user && typeof item.user === "object" ? item.user : null;
        return {
          ...item,
          seller: user ? buildSellerSnapshot(user) : item.seller || null,
        };
      })
    );
  } catch (error) {
    console.error("Error fetching archived items", error);
    return res.status(500).json({ message: "Error fetching archived items" });
  }
};

export const updateItemStatus = async (req, res) => {
  try {
    if (!hasValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid item id" });
    }
    const status = req.body?.status;
    if (!["active", "sold"].includes(status)) {
      return res.status(400).json({ message: "Status must be active or sold" });
    }
    const item = await Item.findById(req.params.id);
    if (
      item &&
      ["hidden", "removed", "under_review"].includes(item.moderationStatus)
    )
      return res.status(403).json({
        message:
          "This listing is moderated. Contact support to request a review.",
      });
    if (!item) return res.status(404).json({ message: "Item not found" });
    if (String(item.user) !== String(req.user?._id)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    item.status = status;
    item.soldAt = status === "sold" ? new Date() : null;
    await item.save();
    return res.status(200).json({
      message: status === "sold" ? "Item archived" : "Item restored",
      item,
    });
  } catch (error) {
    return sendControllerError(res, error, "Unable to update item status");
  }
};

export const updateItem = async (req, res) => {
  const uploadedImages = [];
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!hasValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid item id" });
    }

    const item = await Item.findById(req.params.id);
    if (
      item &&
      ["hidden", "removed", "under_review"].includes(item.moderationStatus)
    )
      return res.status(403).json({
        message:
          "This listing is moderated. Contact support to request a review.",
      });
    if (!item) return res.status(404).json({ message: "Item not found" });

    if (String(item.user) !== String(req.user._id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const title = (req.body.title ?? req.body.name ?? "").trim();
    const category = String(req.body.category || "").trim();
    const description = (req.body.description ?? "").trim();
    const price = req.body.price;

    if (
      !title ||
      !category ||
      !description ||
      price === undefined ||
      price === null ||
      String(price).trim() === ""
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice)) {
      return res.status(400).json({ message: "Price must be a valid number" });
    }
    if (numericPrice < 0) {
      return res
        .status(400)
        .json({ message: "Price must be greater than or equal to 0" });
    }
    if (!Number.isInteger(numericPrice)) {
      return res.status(400).json({ message: "Price must be a whole number" });
    }

    const existingRaw = normalizeImages(
      parseMaybeJson(req.body.existingImages, [])
    );
    const requestedPublicIds = new Set(
      existingRaw.map((image) => image.publicId).filter(Boolean)
    );
    // Never trust URLs/public IDs supplied by the browser. Only retain images
    // that already belong to this listing.
    const existingImages = (item.images || [])
      .filter(
        (image) => image.publicId && requestedPublicIds.has(image.publicId)
      )
      .map((image) => ({ url: image.url, publicId: image.publicId }));

    for (const file of req.files || []) {
      const result = await uploadBufferToCloudinary(file.buffer, "items");
      uploadedImages.push({
        url: result.secure_url,
        publicId: result.public_id,
      });
    }

    const nextImages = [...existingImages, ...uploadedImages].slice(0, 6);

    if (nextImages.length === 0) {
      for (const image of uploadedImages) {
        await cloudinary.uploader.destroy(image.publicId).catch(() => {});
      }
      return res.status(400).json({ message: "At least 1 image is required" });
    }

    // delete removed cloudinary images ,only those we know publicId for
    const prevPublicIds = (item.images || [])
      .map((img) => img.publicId)
      .filter(Boolean);

    const nextPublicIds = nextImages.map((img) => img.publicId).filter(Boolean);

    const removed = prevPublicIds.filter((pid) => !nextPublicIds.includes(pid));

    item.title = title;
    item.price = numericPrice;
    item.category = category;
    item.description = description;
    item.images = nextImages;
    item.seller = buildSellerSnapshot(req.user);

    const saved = await item.save();
    // Cloudinary cleanup happens only after MongoDB has committed the new image
    // list, so a database failure cannot leave the saved listing with dead URLs.
    for (const publicId of removed) {
      await cloudinary.uploader.destroy(publicId).catch(() => {});
    }
    const retainedPublicIds = new Set(nextPublicIds);
    for (const image of uploadedImages) {
      if (!retainedPublicIds.has(image.publicId)) {
        await cloudinary.uploader.destroy(image.publicId).catch(() => {});
      }
    }
    return res.status(200).json({ message: "Item updated", item: saved });
  } catch (err) {
    for (const image of uploadedImages) {
      if (image.publicId)
        await cloudinary.uploader.destroy(image.publicId).catch(() => {});
    }
    return sendControllerError(res, err, "Error updating item");
  }
};

export const deleteItem = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!hasValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid item id" });
    }

    const item = await Item.findById(req.params.id);
    if (
      item &&
      ["hidden", "removed", "under_review"].includes(item.moderationStatus)
    )
      return res.status(403).json({
        message:
          "This listing is moderated. Contact support to request a review.",
      });
    if (!item) return res.status(404).json({ message: "Item not found" });

    if (String(item.user) !== String(req.user._id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // Commit the database deletion first. Cloudinary cleanup is best-effort and
    // must not leave a live listing pointing at deleted images if MongoDB fails.
    await Item.deleteOne({ _id: req.params.id });

    for (const img of item.images || []) {
      if (img.publicId) {
        await cloudinary.uploader.destroy(img.publicId).catch(() => {});
      }
    }

    return res.status(200).json({ message: "Item deleted", id: req.params.id });
  } catch (err) {
    return sendControllerError(res, err, "Error deleting item");
  }
};
