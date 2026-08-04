import React from "react";
import "./sell.css";
import { useSellLogic } from "../Logics/useSell";

function Sell() {
  const {
    item,
    isEditMode,
    isSubmitting,
    handleChange,
    handleImageUpload,
    removeImage,
    handleSubmit,
    handleCancel,
  } = useSellLogic();

  return (
    <div className="post-container">
      <h1 className="post-title">
        {isEditMode ? "Edit Your Item" : "Post Your Items & Sell it!"}
      </h1>

      <form className="post-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Item Images <span className="field-note">Required, up to 6</span></label>
          <div className="image-upload-container">
            {/* Image Previews */}
            {item.images.map((img, index) => (
              <div className="sell-image-preview" key={index}>
                <img src={img.url} alt="preview" />
                <button
                  type="button"
                  className="remove-btn"
                  onClick={() => removeImage(index)}
                  aria-label={`Remove image ${index + 1}`}
                >
                  ×
                </button>
              </div>
            ))}

            {/* Upload Button */}
            {item.images.length < 6 && (
              <label className="upload-box" aria-label="Add item images">
                <span aria-hidden="true">+</span>
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
          <label htmlFor="item-name">Item Name</label>
          <input
            id="item-name"
            type="text"
            name="name"
            value={item.name}
            onChange={handleChange}
            placeholder="Enter item name"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="item-category">Category</label>
          <select
            id="item-category"
            name="category"
            value={item.category}
            onChange={handleChange}
            required
          >
            <option value="">Select category</option>
            <option value="Items">Fashion & Accessories</option>
            <option value="Food">Home & Living</option>
            <option value="Items">Electronics</option>
            <option value="Room">Vehicles & Accessories</option>
            <option value="Room">Rooms for Rent</option>
            <option value="Room">Others</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="item-price">Price (THB)</label>
          <input
            id="item-price"
            type="number"
            name="price"
            value={item.price}
            onChange={handleChange}
            placeholder="Enter price"
            min="0"
            step="1"
            inputMode="numeric"
            onKeyDown={(e) => {
              if (["-", "+", "e", "E", ".", ","].includes(e.key)) {
                e.preventDefault();
              }
            }}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="item-description">Description</label>
          <textarea
            id="item-description"
            name="description"
            value={item.description}
            onChange={handleChange}
            placeholder="Describe your item..."
            rows="4"
            required
          />
        </div>

        {/* Buttons */}
        {isEditMode ? (
          <div className="post-form-actions">
            <button
              type="submit"
              className="submit-btn"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              className="submit-btn secondary"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="submit"
            className="submit-btn"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? "Posting..." : "Post Item"}
          </button>
        )}
      </form>
    </div>
  );
}

export default Sell;
