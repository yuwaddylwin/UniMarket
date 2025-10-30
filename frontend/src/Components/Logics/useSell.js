import { useState } from "react";

export function useSellLogic() {
  const [item, setItem] = useState({
    name: "",
    price: "",
    description: "",
    images: [],
  });

  // Handle text input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setItem((prev) => ({ ...prev, [name]: value }));
  };

  // Handle image upload
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (item.images.length + files.length > 6) {
      alert("You can only upload up to 6 images.");
      return;
    }

    const newImages = files.map((file) => ({
      file,
      url: URL.createObjectURL(file), // For preview
    }));

    setItem((prev) => ({ ...prev, images: [...prev.images, ...newImages] }));
  };

  // Remove image
  const removeImage = (index) => {
    setItem((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  // Handle form submit
  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(item);
    alert("Item posted successfully!");
  };

  return {
    item,
    handleChange,
    handleImageUpload,
    removeImage,
    handleSubmit,
  };
}
