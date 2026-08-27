import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";

const makeEmptyItem = () => ({
  images: [],
  name: "",
  category: "",
  price: "",
  description: "",
});

const makeEmptyAccommodation = () => ({
  images: [],
  title: "",
  location: "",
  price: "",
  pricePeriod: "month",
  description: "",
  accommodationType: "",
  bedrooms: "",
  contactInfo: "",
});

function normalizeImages(images) {
  if (!Array.isArray(images)) return [];
  return images
    .map((image) => {
      if (typeof image === "string") return { url: image };
      const url = image?.url || image?.secure_url;
      const publicId =
        image?.publicId || image?.public_id || image?.publicID || image?.cloudinaryId;
      if (!url) return null;
      return publicId ? { url, publicId } : { url };
    })
    .filter(Boolean);
}

function normalizeWholeNumber(value) {
  if (value === "") return "";
  if (!/^\d+$/.test(value)) return null;
  return value.replace(/^0+(?=\d)/, "");
}

function getErrorMessage(error) {
  const data = error?.response?.data;
  return (
    data?.message ||
    data?.error ||
    (typeof data === "string" ? data : null) ||
    error?.message ||
    "Something went wrong."
  );
}

export function useSellLogic() {
  const navigate = useNavigate();
  const location = useLocation();
  const editPayload = location.state?.mode === "edit" ? location.state?.item : null;
  const [isEditMode, setIsEditMode] = useState(Boolean(editPayload));
  const [editingId, setEditingId] = useState(editPayload?._id || editPayload?.id || null);
  const [listingType, setListingType] = useState("item");
  const [item, setItem] = useState(makeEmptyItem);
  const [accommodation, setAccommodation] = useState(makeEmptyAccommodation);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionLockRef = useRef(false);

  useEffect(() => {
    if (!editPayload) {
      setIsEditMode(false);
      setEditingId(null);
      return;
    }

    setListingType("item");
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

  const handleListingTypeChange = (type) => {
    if (!isEditMode && (type === "item" || type === "accommodation")) {
      setListingType(type);
    }
  };

  const handleItemChange = (event) => {
    const { name, value } = event.target;
    if (name === "price") {
      const normalized = normalizeWholeNumber(value);
      if (normalized === null) return;
      setItem((current) => ({ ...current, price: normalized }));
      return;
    }
    setItem((current) => ({ ...current, [name]: value }));
  };

  const handleAccommodationChange = (event) => {
    const { name, value } = event.target;
    if (name === "price" || name === "bedrooms") {
      const normalized = normalizeWholeNumber(value);
      if (normalized === null) return;
      setAccommodation((current) => ({ ...current, [name]: normalized }));
      return;
    }
    setAccommodation((current) => ({ ...current, [name]: value }));
  };

  const handleImageUpload = (event, type = listingType) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;

    const validFiles = files.filter((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image.`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is larger than 5 MB.`);
        return false;
      }
      return true;
    });

    const update = (current) => {
      const selected = validFiles.slice(0, 6 - current.images.length);
      const images = selected.map((file) => ({
        url: URL.createObjectURL(file),
        file,
        isNew: true,
      }));
      return { ...current, images: [...current.images, ...images] };
    };

    if (type === "accommodation") setAccommodation(update);
    else setItem(update);
  };

  const removeImage = (index, type = listingType) => {
    const update = (current) => {
      const images = [...current.images];
      const removed = images[index];
      if (removed?.isNew && removed.url) URL.revokeObjectURL(removed.url);
      images.splice(index, 1);
      return { ...current, images };
    };
    if (type === "accommodation") setAccommodation(update);
    else setItem(update);
  };

  const appendNewImages = (formData, images) => {
    images.filter((image) => image.file).forEach((image) => formData.append("images", image.file));
  };

  const submitItem = async () => {
    const price = String(item.price).trim();
    if (!item.name.trim() || !item.category || !item.description.trim()) {
      throw new Error("Please complete all required item fields.");
    }
    if (!/^\d+$/.test(price)) throw new Error("Price must be a valid whole number.");
    const hasImage = item.images.some((image) => image.file || (isEditMode && image.publicId));
    if (!hasImage) throw new Error("Please upload at least one image.");

    const formData = new FormData();
    formData.append("title", item.name.trim());
    formData.append("name", item.name.trim());
    formData.append("category", item.category);
    formData.append("price", price);
    formData.append("description", item.description.trim());

    if (isEditMode) {
      const existing = item.images
        .filter((image) => !image.file && image.publicId)
        .map((image) => ({ url: image.url, publicId: image.publicId }));
      formData.append("existingImages", JSON.stringify(existing));
      if (!editingId) throw new Error("Missing item id for edit.");
      appendNewImages(formData, item.images);
      await axiosInstance.put(`/items/${editingId}`, formData);
      toast.success("Item updated successfully");
      navigate(-1);
      return;
    }

    appendNewImages(formData, item.images);
    await axiosInstance.post("/items", formData);
    toast.success("Item posted successfully");
    setItem(makeEmptyItem());
    navigate("/");
  };

  const submitAccommodation = async () => {
    const required = [
      ["Accommodation name", accommodation.title],
      ["Location", accommodation.location],
      ["Price", accommodation.price],
      ["Description", accommodation.description],
      ["Accommodation type", accommodation.accommodationType],
    ];
    const missing = required.find(([, value]) => !String(value).trim());
    if (missing) throw new Error(`${missing[0]} is required.`);
    if (!/^\d+$/.test(String(accommodation.price))) {
      throw new Error("Price must be a valid whole number.");
    }
    if (accommodation.bedrooms !== "" && !/^\d+$/.test(String(accommodation.bedrooms))) {
      throw new Error("Bedrooms must be a valid whole number.");
    }
    if (!accommodation.images.some((image) => image.file)) {
      throw new Error("Please upload at least one accommodation image.");
    }

    const formData = new FormData();
    [
      "title",
      "location",
      "price",
      "pricePeriod",
      "description",
      "accommodationType",
      "bedrooms",
      "contactInfo",
    ].forEach((field) => formData.append(field, accommodation[field]));
    appendNewImages(formData, accommodation.images);

    await axiosInstance.post("/accommodations", formData);
    toast.success("Accommodation posted successfully");
    setAccommodation(makeEmptyAccommodation());
    navigate("/");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submissionLockRef.current) return;
    submissionLockRef.current = true;
    setIsSubmitting(true);

    try {
      if (listingType === "accommodation" && !isEditMode) await submitAccommodation();
      else await submitItem();
    } catch (error) {
      console.error(error);
      toast.error(getErrorMessage(error));
    } finally {
      submissionLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  return {
    listingType,
    item,
    accommodation,
    isEditMode,
    isSubmitting,
    handleListingTypeChange,
    handleItemChange,
    handleAccommodationChange,
    handleImageUpload,
    removeImage,
    handleSubmit,
    handleCancel: () => navigate(-1),
  };
}
