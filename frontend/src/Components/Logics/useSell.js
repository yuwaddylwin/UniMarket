import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const initialItem = {
  name: "",
  category: "",
  price: "",
  description: "",
  images: [], // [{ url, publicId }]
};

export function useSellLogic() {
  const [item, setItem] = useState(initialItem);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setItem((prev) => ({ ...prev, [name]: value }));
  };

  //  Upload files to backend -> backend uploads to Cloudinary -> returns real URLs
const handleImageUpload = async (e) => {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;

  const remaining = 6 - item.images.length;
  const selected = files.slice(0, remaining);

  const formData = new FormData();
  selected.forEach((f) => formData.append("images", f));

  try {
    setUploading(true);

    const res = await axios.post("http://localhost:8000/api/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    const uploaded = res.data.urls.map((url, idx) => ({
      url,
      publicId: res.data.publicIds?.[idx],
    }));

    setItem((prev) => ({
      ...prev,
      images: [...prev.images, ...uploaded],
    }));

    toast.success("Image uploaded!");
  } catch (err) {
    console.error(err);
    toast.error("Image upload failed");
  } finally {
    setUploading(false);
    e.target.value = "";
  }
};


  const removeImage = (index) => {
    setItem((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || uploading) return;

    // Save real Cloudinary urls in DB
    const payload = {
      title: item.name,
      category: item.category,
      price: Number(item.price),
      description: item.description,
      images: item.images.map((img) => img.url), //  real URLs
    };

    try {
      setLoading(true);

      await toast.promise(
        axios.post("http://localhost:8000/api/items", payload),
        {
          loading: "Posting item...",
          success: "Item successfully posted 🎉",
          error: "Error posting item!",
        }
      );

      setItem(initialItem); //  clear form
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return {
    item,
    handleChange,
    handleImageUpload,
    removeImage,
    handleSubmit,
    loading,
    uploading,
  };
}
