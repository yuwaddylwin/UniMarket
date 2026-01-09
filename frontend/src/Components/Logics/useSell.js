import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import toast from "react-hot-toast";

const emptyItem = {
  name: "",
  category: "",
  price: "",
  description: "",
  images: [],
};

export function useSellLogic() {
  const [item, setItem] = useState(emptyItem);
  const [posting, setPosting] = useState(false);

  const { authUser } = useAuthStore();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setItem((prev) => ({ ...prev, [name]: value }));
  };

  const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remaining = 6 - item.images.length;
    const picked = files.slice(0, remaining);

    const urls = await Promise.all(picked.map(fileToDataUrl));
    const newImgs = urls.map((url) => ({ url }));

    setItem((prev) => ({
      ...prev,
      images: [...prev.images, ...newImgs],
    }));

    e.target.value = "";
  };

  const removeImage = (index) => {
    setItem((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!authUser?._id) {
      toast.error("You must be logged in to post an item.");
      return;
    }

    // backend expects: title, price, images (string[]), category, description
    const payload = {
      title: item.name.trim(),
      category: item.category,
      price: Number(item.price),
      description: item.description.trim(),
      images: item.images.map((img) => img.url).slice(0, 6),
    };

    try {
      setPosting(true);

      await toast.promise(
        axios.post("http://localhost:8000/api/items", payload, {
          withCredentials: true,
        }),
        {
          loading: "Posting item...",
          success: "Item successfully posted 🎉",
          error: (err) => err?.response?.data?.message ||"Error posting item!",
        }
      );

      setItem(emptyItem);
      navigate("/");
    } catch (err) {
      console.error("Post item error:", err);

      // Optional: show backend message instead of generic error
      toast.error(err?.response?.data?.message || err.message || "Post failed");
    } finally {
      setPosting(false);
    }
  };

  return {
    item,
    handleChange,
    handleImageUpload,
    removeImage,
    handleSubmit,
    posting,
  };
}
