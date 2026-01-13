import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const emptyItem = {
  images: [], // [{ url: string, publicId?: string, file?: File, isNew?: boolean }]
  name: "",
  category: "",
  price: 0,
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

  async function getErrorMessage(res) {
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await res.json().catch(() => null);
      return data?.message || "Request failed";
    }
    const text = await res.text().catch(() => "");
    return text || "Request failed";
  }

  const API_BASE ="http://localhost:8000";


  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const fd = new FormData();
      fd.append("title", item.name);
      fd.append("name", item.name);
      fd.append("category", item.category);
      fd.append("price", String(Number(item.price) || 0));
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

        const res = await fetch(`${API_BASE}/api/items/${editingId}`, {
          method: "PUT",
          body: fd,
          credentials: "include",
        });

        if (!res.ok) throw new Error(await getErrorMessage(res));

        toast.success("Item updated successfully");
        navigate(-1);
        return;
      }

      // CREATE MODE -> POST
      const res = await fetch(`${API_BASE}/api/items`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });

      if (!res.ok) throw new Error(await getErrorMessage(res));

      toast.success("Item posted successfully");
      setItem(emptyItem);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Something went wrong.");
    }
  };

  return {
    item,
    isEditMode,
    handleChange,
    handleImageUpload,
    removeImage,
    handleSubmit,
    handleCancel,
  };
}
