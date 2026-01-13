import Item from "../models/ItemsList.model.js";
import cloudinary from "../lib/cloudinary.js";

// build seller snapshot from req.user
function buildSellerSnapshot(user) {
  if (!user) return undefined;

  const fullName =
    user.fullName || user.name || user.username || user.email || "Seller";

  const profilePic = user.profilePic || user.avatar || user.photo || "";

  return {
    id: user._id,
    fullName,
    profilePic,
  };
}

function parseMaybeJson(value, fallback) {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

// normalize to [{url, publicId}]
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

// upload buffer to cloudinary using upload_stream
function uploadBufferToCloudinary(buffer, folder = "items") {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

export const createItem = async (req, res) => {
  try {
    const title = (req.body.title ?? req.body.name ?? "").trim();
    const category = req.body.category;
    const description = (req.body.description ?? "").trim();
    const price = req.body.price;

    if (!title || !category || !description || price === undefined) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (!req.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // upload new images to cloudinary
    const uploadedImages = [];
    for (const file of req.files || []) {
      const result = await uploadBufferToCloudinary(file.buffer, "items");
      uploadedImages.push({
        url: result.secure_url,
        publicId: result.public_id,
      });
    }

    if (uploadedImages.length === 0) {
      return res.status(400).json({ message: "At least 1 image is required" });
    }

    const newItem = await Item.create({
      title,
      price: Number(price),
      images: uploadedImages.slice(0, 6),
      category,
      description,
      user: req.user._id,
      seller: buildSellerSnapshot(req.user),
    });

    return res.status(201).json(newItem);
  } catch (err) {
    return res.status(400).json({ message: err.message || "Error creating item" });
  }
};

export const getItems = async (req, res) => {
  try {
    const items = await Item.find()
      .sort({ createdAt: -1 })
      .populate("user", "fullName username name email profilePic avatar photo")
      .lean();

    const normalized = items.map((it) => {
      const u = it.user && typeof it.user === "object" ? it.user : null;

      const seller =
        it.seller?.fullName || it.seller?.profilePic || it.seller?.id
          ? it.seller
          : u
          ? {
              id: u._id,
              fullName: u.fullName || u.name || u.username || u.email || "Seller",
              profilePic: u.profilePic || u.avatar || u.photo || "",
            }
          : null;

      return { ...it, seller };
    });

    return res.status(200).json(normalized);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Error fetching items" });
  }
};

export const getMyItems = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const items = await Item.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate("user", "fullName username name email profilePic avatar photo")
      .lean();

    const normalized = items.map((it) => {
      const u = it.user && typeof it.user === "object" ? it.user : null;

      const seller =
        it.seller?.fullName || it.seller?.profilePic || it.seller?.id
          ? it.seller
          : u
          ? {
              id: u._id,
              fullName: u.fullName || u.name || u.username || u.email || "Seller",
              profilePic: u.profilePic || u.avatar || u.photo || "",
            }
          : null;

      return { ...it, seller };
    });

    return res.status(200).json(normalized);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Error fetching my items" });
  }
};

export const getItemById = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id)
      .populate("user", "fullName username name email profilePic avatar photo")
      .lean();

    if (!item) return res.status(404).json({ message: "Item not found" });

    const u = item.user && typeof item.user === "object" ? item.user : null;

    const seller =
      item.seller?.fullName || item.seller?.profilePic || item.seller?.id
        ? item.seller
        : u
        ? {
            id: u._id,
            fullName: u.fullName || u.name || u.username || u.email || "Seller",
            profilePic: u.profilePic || u.avatar || u.photo || "",
          }
        : null;

    return res.status(200).json({ ...item, seller });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Error fetching item" });
  }
};

// UPDATE (Cloudinary)
export const updateItem = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });

    if (String(item.user) !== String(req.user._id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const title = (req.body.title ?? req.body.name ?? "").trim();
    const category = req.body.category;
    const description = (req.body.description ?? "").trim();
    const price = req.body.price;

    if (!title || !category || !description || price === undefined) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // kept existing cloudinary images from frontend
    const existingRaw = parseMaybeJson(req.body.existingImages, []);
    const existingImages = normalizeImages(existingRaw);

    // upload new files to cloudinary
    const newImages = [];
    for (const file of req.files || []) {
      const result = await uploadBufferToCloudinary(file.buffer, "items");
      newImages.push({ url: result.secure_url, publicId: result.public_id });
    }

    const nextImages = [...existingImages, ...newImages].slice(0, 6);

    if (nextImages.length === 0) {
      return res.status(400).json({ message: "At least 1 image is required" });
    }

    // delete removed cloudinary images ,only those we know publicId for
    const prevPublicIds = (item.images || [])
      .map((img) => img.publicId)
      .filter(Boolean);

    const nextPublicIds = nextImages.map((img) => img.publicId).filter(Boolean);

    const removed = prevPublicIds.filter((pid) => !nextPublicIds.includes(pid));
    for (const publicId of removed) {
      await cloudinary.uploader.destroy(publicId).catch(() => {});
    }

    item.title = title;
    item.price = Number(price);
    item.category = category;
    item.description = description;
    item.images = nextImages;
    item.seller = buildSellerSnapshot(req.user);

    const saved = await item.save();
    return res.status(200).json({ message: "Item updated", item: saved });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Error updating item" });
  }
};

export const deleteItem = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });

    if (String(item.user) !== String(req.user._id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // delete images from cloudinary too
    for (const img of item.images || []) {
      if (img.publicId) {
        await cloudinary.uploader.destroy(img.publicId).catch(() => {});
      }
    }

    await Item.deleteOne({ _id: req.params.id });

    return res.status(200).json({ message: "Item deleted", id: req.params.id });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Error deleting item" });
  }
};
