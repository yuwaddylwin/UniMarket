import Accommodation from "../models/Accommodation.model.js";
import cloudinary from "../lib/cloudinary.js";
import mongoose from "mongoose";

function hasValidId(id) {
  return mongoose.isObjectIdOrHexString(id);
}

function sendControllerError(res, error, fallback) {
  if (error?.name === "ValidationError" || error?.name === "CastError") {
    return res.status(400).json({ message: error.message || fallback });
  }
  console.error(fallback, error);
  return res.status(500).json({ message: fallback });
}

function buildSellerSnapshot(user) {
  if (!user) return undefined;
  return {
    id: user._id,
    fullName: user.fullName || user.name || user.username || user.email || "Host",
    profilePic: user.profilePic || user.avatar || user.photo || "",
  };
}

function uploadBufferToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "accommodations" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
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

function normalizeImages(images) {
  if (!Array.isArray(images)) return [];
  return images
    .map((image) => {
      if (!image || typeof image !== "object") return null;
      const url = String(image.url || "").trim();
      const publicId = String(image.publicId || "").trim();
      return url && publicId ? { url, publicId } : null;
    })
    .filter(Boolean)
    .slice(0, 6);
}

function normalizeAccommodation(accommodation) {
  const user =
    accommodation.user && typeof accommodation.user === "object"
      ? accommodation.user
      : null;
  const seller = user
    ? buildSellerSnapshot(user)
    : accommodation.seller?.fullName ||
      accommodation.seller?.profilePic ||
      accommodation.seller?.id
    ? accommodation.seller
    : null;

  return { ...accommodation, seller };
}

export const createAccommodation = async (req, res) => {
  const uploadedImages = [];

  try {
    if (!req.user?._id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const title = String(req.body.title || "").trim();
    const location = String(req.body.location || "").trim();
    const description = String(req.body.description || "").trim();
    const accommodationType = String(req.body.accommodationType || "").trim();
    const pricePeriod = String(req.body.pricePeriod || "month").trim();
    const contactInfo = String(req.body.contactInfo || "").trim();
    const price = String(req.body.price ?? "").trim();
    const bedrooms = String(req.body.bedrooms ?? "").trim();

    const requiredFields = [
      ["Accommodation name", title],
      ["Location", location],
      ["Price", price],
      ["Price period", pricePeriod],
      ["Description", description],
      ["Accommodation type", accommodationType],
    ];
    const missing = requiredFields.find(([, value]) => !value);
    if (missing) {
      return res.status(400).json({
        success: false,
        message: `${missing[0]} is required`,
      });
    }

    const allowedPeriods = ["day", "week", "month", "semester"];
    if (!allowedPeriods.includes(pricePeriod)) {
      return res.status(400).json({ success: false, message: "Invalid price period" });
    }

    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      return res.status(400).json({
        success: false,
        message: "Price must be a valid number greater than or equal to 0",
      });
    }

    let numericBedrooms = null;
    if (bedrooms !== "") {
      numericBedrooms = Number(bedrooms);
      if (!Number.isInteger(numericBedrooms) || numericBedrooms < 0) {
        return res.status(400).json({
          success: false,
          message: "Bedrooms must be a whole number greater than or equal to 0",
        });
      }
    }

    if (!req.files?.length) {
      return res.status(400).json({
        success: false,
        message: "At least 1 image is required",
      });
    }

    for (const file of req.files) {
      const result = await uploadBufferToCloudinary(file.buffer);
      uploadedImages.push({ url: result.secure_url, publicId: result.public_id });
    }

    const accommodation = await Accommodation.create({
      title,
      location,
      price: numericPrice,
      pricePeriod,
      description,
      accommodationType,
      bedrooms: numericBedrooms,
      contactInfo,
      images: uploadedImages.slice(0, 6),
      user: req.user._id,
      seller: buildSellerSnapshot(req.user),
    });

    return res.status(201).json(accommodation);
  } catch (error) {
    for (const image of uploadedImages) {
      if (image.publicId) await cloudinary.uploader.destroy(image.publicId).catch(() => {});
    }
    if (error?.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error("Error creating accommodation:", error);
    return res.status(500).json({ success: false, message: "Error creating accommodation" });
  }
};

export const getAccommodations = async (_req, res) => {
  try {
    const accommodations = await Accommodation.find({ status: { $ne: "sold" } })
      .sort({ createdAt: -1 })
      .populate("user", "fullName username name email profilePic avatar photo")
      .lean();

    return res.status(200).json(accommodations.map(normalizeAccommodation));
  } catch (error) {
    console.error("Error fetching accommodations", error);
    return res.status(500).json({ message: "Error fetching accommodations" });
  }
};

export const getMyAccommodations = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ message: "Unauthorized" });
    const accommodations = await Accommodation.find({ user: req.user._id, status: { $ne: "sold" } })
      .sort({ createdAt: -1 })
      .populate("user", "fullName username name email profilePic avatar photo")
      .lean();
    return res.status(200).json(accommodations.map(normalizeAccommodation));
  } catch (error) {
    console.error("Error fetching my accommodations", error);
    return res.status(500).json({ message: "Error fetching accommodations" });
  }
};

export const getAccommodationById = async (req, res) => {
  try {
    if (!hasValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid accommodation id" });
    }
    const accommodation = await Accommodation.findOne({ _id: req.params.id, status: { $ne: "sold" } })
      .populate("user", "fullName username name email profilePic avatar photo")
      .lean();

    if (!accommodation) {
      return res.status(404).json({ message: "Accommodation not found" });
    }

    return res.status(200).json(normalizeAccommodation(accommodation));
  } catch (error) {
    return sendControllerError(res, error, "Error fetching accommodation");
  }
};

export const updateAccommodation = async (req, res) => {
  const uploadedImages = [];

  try {
    if (!req.user?._id) return res.status(401).json({ message: "Unauthorized" });

    if (!hasValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid accommodation id" });
    }

    const accommodation = await Accommodation.findById(req.params.id);
    if (!accommodation) return res.status(404).json({ message: "Accommodation not found" });
    if (String(accommodation.user) !== String(req.user._id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const title = String(req.body.title || "").trim();
    const location = String(req.body.location || "").trim();
    const description = String(req.body.description || "").trim();
    const accommodationType = String(req.body.accommodationType || "").trim();
    const pricePeriod = String(req.body.pricePeriod || "month").trim();
    const contactInfo = String(req.body.contactInfo || "").trim();
    const price = String(req.body.price ?? "").trim();
    const bedrooms = String(req.body.bedrooms ?? "").trim();

    if (!title || !location || !description || !accommodationType || !price) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    if (!["day", "week", "month", "semester"].includes(pricePeriod)) {
      return res.status(400).json({ message: "Invalid price period" });
    }

    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      return res.status(400).json({ message: "Price must be a valid number greater than or equal to 0" });
    }

    let numericBedrooms = null;
    if (bedrooms !== "") {
      numericBedrooms = Number(bedrooms);
      if (!Number.isInteger(numericBedrooms) || numericBedrooms < 0) {
        return res.status(400).json({ message: "Bedrooms must be a whole number greater than or equal to 0" });
      }
    }

    const requestedExisting = normalizeImages(parseMaybeJson(req.body.existingImages, []));
    const requestedPublicIds = new Set(requestedExisting.map((image) => image.publicId));
    const existingImages = (accommodation.images || [])
      .filter((image) => requestedPublicIds.has(image.publicId))
      .map((image) => ({ url: image.url, publicId: image.publicId }));
    for (const file of req.files || []) {
      const result = await uploadBufferToCloudinary(file.buffer);
      uploadedImages.push({ url: result.secure_url, publicId: result.public_id });
    }

    const nextImages = [...existingImages, ...uploadedImages].slice(0, 6);
    if (!nextImages.length) {
      return res.status(400).json({ message: "At least 1 image is required" });
    }

    const nextPublicIds = new Set(nextImages.map((image) => image.publicId));
    const removedPublicIds = (accommodation.images || [])
      .map((image) => image.publicId)
      .filter((publicId) => publicId && !nextPublicIds.has(publicId));

    accommodation.title = title;
    accommodation.location = location;
    accommodation.price = numericPrice;
    accommodation.pricePeriod = pricePeriod;
    accommodation.description = description;
    accommodation.accommodationType = accommodationType;
    accommodation.bedrooms = numericBedrooms;
    accommodation.contactInfo = contactInfo;
    accommodation.images = nextImages;
    accommodation.seller = buildSellerSnapshot(req.user);

    const saved = await accommodation.save();
    for (const publicId of removedPublicIds) {
      await cloudinary.uploader.destroy(publicId).catch(() => {});
    }
    const retainedPublicIds = new Set(nextImages.map((image) => image.publicId));
    for (const image of uploadedImages) {
      if (!retainedPublicIds.has(image.publicId)) {
        await cloudinary.uploader.destroy(image.publicId).catch(() => {});
      }
    }

    return res.status(200).json({ message: "Accommodation updated", accommodation: saved });
  } catch (error) {
    for (const image of uploadedImages) {
      if (image.publicId) await cloudinary.uploader.destroy(image.publicId).catch(() => {});
    }
    return sendControllerError(res, error, "Error updating accommodation");
  }
};

export const deleteAccommodation = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ message: "Unauthorized" });

    if (!hasValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid accommodation id" });
    }

    const accommodation = await Accommodation.findById(req.params.id);
    if (!accommodation) return res.status(404).json({ message: "Accommodation not found" });
    if (String(accommodation.user) !== String(req.user._id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await Accommodation.deleteOne({ _id: req.params.id });
    for (const image of accommodation.images || []) {
      if (image.publicId) await cloudinary.uploader.destroy(image.publicId).catch(() => {});
    }
    return res.status(200).json({ message: "Accommodation deleted", id: req.params.id });
  } catch (error) {
    return sendControllerError(res, error, "Error deleting accommodation");
  }
};

export const getMyArchivedAccommodations = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ message: "Unauthorized" });
    const accommodations = await Accommodation.find({ user: req.user._id, status: "sold" })
      .sort({ soldAt: -1, updatedAt: -1 })
      .populate("user", "fullName username name email profilePic avatar photo")
      .lean();
    return res.status(200).json(accommodations.map(normalizeAccommodation));
  } catch (error) {
    console.error("Error fetching archived accommodations", error);
    return res.status(500).json({ message: "Error fetching archived accommodations" });
  }
};

export const updateAccommodationStatus = async (req, res) => {
  try {
    if (!hasValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid accommodation id" });
    }
    const status = req.body?.status;
    if (!["active", "sold"].includes(status)) {
      return res.status(400).json({ message: "Status must be active or sold" });
    }
    const accommodation = await Accommodation.findById(req.params.id);
    if (!accommodation) return res.status(404).json({ message: "Accommodation not found" });
    if (String(accommodation.user) !== String(req.user?._id)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    accommodation.status = status;
    accommodation.soldAt = status === "sold" ? new Date() : null;
    await accommodation.save();
    return res.status(200).json({
      message: status === "sold" ? "Accommodation archived" : "Accommodation restored",
      accommodation,
    });
  } catch (error) {
    return sendControllerError(res, error, "Unable to update accommodation status");
  }
};
