import Item from "../models/ItemsList.model.js"

// build seller snapshot from req.user 
function buildSellerSnapshot(user) {
  if (!user) return undefined;

  const fullName =
    user.fullName ||
    user.name ||
    user.username ||
    user.email ||
    "Seller";

  const profilePic =
    user.profilePic ||
    user.avatar ||
    user.photo ||
    "";

  return {
    id: user._id,
    fullName,
    profilePic,
  };
}

export const createItem = async (req, res) => {
  try {
    const { title, price, images, category, description } = req.body;

    if (!title || !category || !description || price === undefined) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (!req.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const newItem = await Item.create({
      title: title.trim(),
      price: Number(price),
      images: Array.isArray(images) ? images.slice(0, 6) : [],
      category,
      description: description.trim(),

      // connect to logged-in user (from auth middleware)
      user: req.user._id,

      // save snapshot so frontend can show seller without populate
      seller: buildSellerSnapshot(req.user),
    });

    return res.status(201).json(newItem);
  } catch (err) {
    return res
      .status(400)
      .json({ message: err.message || "Error creating item" });
  }
};

export const getItems = async (req, res) => {
  try {
    const items = await Item.find()
      .sort({ createdAt: -1 })
      // populate so old items (without seller snapshot) still show seller info
      .populate("user", "fullName username name email profilePic avatar photo")
      .lean();

    // ensure every item has a seller object
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
    return res
      .status(500)
      .json({ message: err.message || "Error fetching items" });
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
    return res
      .status(500)
      .json({ message: err.message || "Error fetching my items" });
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
    return res
      .status(400)
      .json({ message: err.message || "Error fetching item" });
  }
};
