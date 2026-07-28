import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";

const emptyItem = {
  images: [], // [{ url: string, publicId?: string, file?: File, isNew?: boolean }]
  name: "",
  category: "",
  price: "",
  description: "",
};

function normalizeImages(images) {
  if (!Array.isArray(images)) return [];

  return images
    .map((img) => {
      // Sometimes backend may return ["url1", "url2"]
      if (typeof img === "string") return { url: img };

      const url = img?.url || img?.secure_url; // handle common variants
      const publicId =
        img?.publicId ||
        img?.public_id ||
        img?.publicID ||
        img?.cloudinaryId ||
        img?.cloudinary_id;

      if (!url) return null;

      // Keep publicId if we have it (needed for edit mode)
      return publicId ? { url, publicId } : { url };
    })
    .filter(Boolean);
}

export function useSellLogic() {
  const navigate = useNavigate();
  const location = useLocation();

  const editPayload =
    location.state?.mode === "edit" ? location.state?.item : null;

  const [isEditMode, setIsEditMode] = useState(Boolean(editPayload));
  const [editingId, setEditingId] = useState(
    editPayload?._id || editPayload?.id || null
  );

  const [item, setItem] = useState(emptyItem);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionLockRef = useRef(false);

  useEffect(() => {
    if (!editPayload) {
      setIsEditMode(false);
      setEditingId(null);
      setItem(emptyItem);
      return;
    }

    setIsEditMode(true);
    setEditingId(editPayload?._id || editPayload?.id || null);

    setItem({
      images: normalizeImages(editPayload.images),
      name: editPayload.title || editPayload.name || "",
      category: editPayload.category || "",
      price: editPayload.price ?? 0,
      description: editPayload.description || "",
    });
  }, [editPayload]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "price") {
      if (value === "") {
        setItem((prev) => ({ ...prev, price: "" }));
        return;
      }

      // Prices are whole THB amounts. Ignore invalid input and remove leading
      // zeroes while preserving a single zero as a valid value.
      if (!/^\d+$/.test(value)) return;
      const normalizedPrice = value.replace(/^0+(?=\d)/, "");
      setItem((prev) => ({ ...prev, price: normalizedPrice }));
      return;
    }

    setItem((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setItem((prev) => {
      const remaining = 6 - prev.images.length;
      const selected = files.slice(0, remaining);

      const newImgs = selected.map((file) => ({
        url: URL.createObjectURL(file), // preview only
        file,
        isNew: true,
      }));

      return { ...prev, images: [...prev.images, ...newImgs] };
    });

    e.target.value = "";
  };

  const removeImage = (index) => {
    setItem((prev) => {
      const next = [...prev.images];
      const removed = next[index];

      // revoke only for newly created preview URLs
      if (removed?.isNew && removed?.url) {
        URL.revokeObjectURL(removed.url);
      }

      next.splice(index, 1);
      return { ...prev, images: next };
    });
  };

  const handleCancel = () => navigate(-1);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // State updates are asynchronous, so use a ref as an immediate lock to
    // prevent rapid submit events from starting more than one request.
    if (submissionLockRef.current) return;

    const priceValue = String(item.price).trim();
    if (priceValue === "") {
      toast.error("Price is required.");
      return;
    }

    if (priceValue.startsWith("-")) {
      toast.error("Price must be greater than or equal to 0.");
      return;
    }

    if (!/^\d+$/.test(priceValue)) {
      toast.error("Price must be a valid whole number.");
      return;
    }

    const numericPrice = Number(priceValue);
    if (!Number.isFinite(numericPrice)) {
      toast.error("Price must be a valid number.");
      return;
    }

    // The API requires at least one image. Check for an image that will
    // actually be included in the request so an invalid request is not sent.
    const hasImageToSubmit = item.images.some(
      (image) => image.file || (isEditMode && image.publicId)
    );
    if (!hasImageToSubmit) {
      toast.error("Please upload at least one image.");
      return;
    }

    submissionLockRef.current = true;
    setIsSubmitting(true);

    try {
      const fd = new FormData();
      fd.append("title", item.name);
      fd.append("name", item.name);
      fd.append("category", item.category);
      fd.append("price", String(numericPrice));
      fd.append("description", item.description);

      // Existing images (from DB). only include ones with publicId.
      // This prevents sending publicId: "" which causes Mongoose validation error.
      const existing = item.images
        .filter((img) => !img.file) // not newly uploaded
        .map((img) => ({ url: img.url, publicId: img.publicId }))
        .filter((img) => img.publicId); // only keep valid ones

      if (isEditMode) {
        fd.append("existingImages", JSON.stringify(existing));
      }

      // New uploads
      item.images
        .filter((img) => img.file)
        .forEach((img) => fd.append("images", img.file));

      // EDIT MODE -> PUT
      if (isEditMode) {
        if (!editingId) throw new Error("Missing item id for edit");

        await axiosInstance.put(`/items/${editingId}`, fd);

        toast.success("Item updated successfully");
        navigate(-1);
        return;
      }

      // CREATE MODE -> POST
      await axiosInstance.post(`/items`, fd);

      toast.success("Item posted successfully");
      setItem(emptyItem);
    } catch (err) {
      console.error(err);
      const responseData = err?.response?.data;
      const message =
        responseData?.message ||
        responseData?.error ||
        (typeof responseData === "string" ? responseData : null) ||
        err?.message ||
        "Something went wrong.";
      toast.error(message);
    } finally {
      submissionLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  return {
    item,
    isEditMode,
    isSubmitting,
    handleChange,
    handleImageUpload,
    removeImage,
    handleSubmit,
    handleCancel,
  };
}
