import Accommodation from "../models/Accommodation.model.js";
import cloudinary from "../lib/cloudinary.js";

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

function normalizeAccommodation(accommodation) {
  const user =
    accommodation.user && typeof accommodation.user === "object"
      ? accommodation.user
      : null;
  const seller =
    accommodation.seller?.fullName ||
    accommodation.seller?.profilePic ||
    accommodation.seller?.id
      ? accommodation.seller
      : user
      ? buildSellerSnapshot(user)
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
    console.error("Error creating accommodation:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Error creating accommodation",
    });
  }
};

export const getAccommodations = async (_req, res) => {
  try {
    const accommodations = await Accommodation.find()
      .sort({ createdAt: -1 })
      .populate("user", "fullName username name email profilePic avatar photo")
      .lean();

    return res.status(200).json(accommodations.map(normalizeAccommodation));
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Error fetching accommodations",
    });
  }
};

export const getMyAccommodations = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ message: "Unauthorized" });
    const accommodations = await Accommodation.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate("user", "fullName username name email profilePic avatar photo")
      .lean();
    return res.status(200).json(accommodations.map(normalizeAccommodation));
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Error fetching accommodations",
    });
  }
};
