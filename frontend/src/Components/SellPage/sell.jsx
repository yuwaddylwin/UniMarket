// 📁 src/Components/SellPage/Sell.jsx
import React from "react";
import "./sell.css";
import { useSellLogic } from "../Logics/useSell";


function Sell() {
  const { item, handleChange, handleImageUpload, removeImage, handleSubmit } =
    useSellLogic();

  return (
    <div className="post-container">
      <h1 className="title">Post Your Items & Sell it!</h1>
      <form className="post-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Item Images (max 6)</label>
          <div className="image-upload-container">
            {/* Image Previews */}
            {item.images.map((img, index) => (
              <div className="image-preview" key={index}>
                <img src={img.url} alt="preview" />
                <button
                  type="button"
                  className="remove-btn"
                  onClick={() => removeImage(index)}
                >
                  ×
                </button>
              </div>
            ))}

            {/* Upload Button */}
            {item.images.length < 6 && (
              <label className="upload-box">
                +
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  hidden
                />
              </label>
            )}
          </div>
        </div>

        <div className="form-group">
          <label>Item Name</label>
          <input
            type="text"
            name="name"
            value={item.name}
            onChange={handleChange}
            placeholder="Enter item name"
            required
          />
        </div>

        <div className="form-group">
          <label>Price (THB)</label>
          <input
            type="number"
            name="price"
            value={item.price}
            onChange={handleChange}
            placeholder="Enter price"
            required
          />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            name="description"
            value={item.description}
            onChange={handleChange}
            placeholder="Describe your item..."
            rows="4"
            required
          />
        </div>

        <button type="submit" className="submit-btn">
          Post Item
        </button>
      </form>
    </div>
  );
}

export default Sell;
