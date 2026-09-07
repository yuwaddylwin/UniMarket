import React from "react";
import { Building2, ImagePlus, Package } from "lucide-react";
import "./sell.css";
import { useSellLogic } from "../Logics/useSell";

const preventInvalidNumberKeys = (event) => {
  if (["-", "+", "e", "E", ".", ","].includes(event.key)) event.preventDefault();
};

function Sell() {
  const {
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
    handleCancel,
  } = useSellLogic();

  const isAccommodation = listingType === "accommodation";
  const currentListing = isAccommodation ? accommodation : item;

  return (
    <main className="post-page">
      <div className="post-container">
        <header className="post-header">
          <span className="post-header-icon" aria-hidden="true">{isAccommodation ? <Building2 /> : <Package />}</span>
          <span className="post-eyebrow">{isEditMode ? "Your listing" : "Made for your campus"}</span>
          <h1 className="post-title">{isEditMode ? `Edit your ${isAccommodation ? "accommodation" : "item"}` : "What do you want to post?"}</h1>
          <p>{isEditMode ? "Update your listing details below." : "Choose a listing type and share it with your university community."}</p>
        </header>

        {!isEditMode && (
          <div className="post-type-toggle" role="radiogroup" aria-label="Listing type">
            <button
              className={listingType === "item" ? "is-active" : ""}
              type="button"
              role="radio"
              aria-checked={listingType === "item"}
              onClick={() => handleListingTypeChange("item")}
            >
              <Package aria-hidden="true" />
              <span><strong>Item</strong><small>Books, tech, furniture and more</small></span>
            </button>
            <button
              className={listingType === "accommodation" ? "is-active" : ""}
              type="button"
              role="radio"
              aria-checked={listingType === "accommodation"}
              onClick={() => handleListingTypeChange("accommodation")}
            >
              <Building2 aria-hidden="true" />
              <span><strong>Accommodation</strong><small>Rooms, studios and shared homes</small></span>
            </button>
          </div>
        )}

        <form className="post-form" onSubmit={handleSubmit} noValidate>
          <div className="post-section-heading"><span>01</span><div><h2>Start with the photos</h2><p>A clear first photo helps your listing stand out.</p></div></div>
          <ImageUploader
            images={currentListing.images}
            listingType={isAccommodation ? "accommodation" : "item"}
            label={isAccommodation ? "Accommodation images" : "Item images"}
            onUpload={handleImageUpload}
            onRemove={removeImage}
          />

          <div className="post-section-heading"><span>02</span><div><h2>Add the details</h2><p>Give your campus community the essentials.</p></div></div>
          {isAccommodation ? (
            <AccommodationFields value={accommodation} onChange={handleAccommodationChange} />
          ) : (
            <ItemFields value={item} onChange={handleItemChange} />
          )}

          {isEditMode ? (
            <div className="post-form-actions">
              <button type="submit" className="submit-btn" disabled={isSubmitting} aria-busy={isSubmitting}>
                {isSubmitting ? "Saving…" : "Save changes"}
              </button>
              <button type="button" className="submit-btn secondary" onClick={handleCancel} disabled={isSubmitting}>
                Cancel
              </button>
            </div>
          ) : (
            <button type="submit" className="submit-btn" disabled={isSubmitting} aria-busy={isSubmitting}>
              {isSubmitting ? "Posting…" : isAccommodation ? "Post Accommodation" : "Post Item"}
            </button>
          )}
        </form>
      </div>
    </main>
  );
}

function ImageUploader({ images, listingType, label, onUpload, onRemove }) {
  return (
    <div className="form-group form-group--full">
      <label>{label} <span className="field-note">Required · Up to 6 · Max 5 MB each</span></label>
      <div className={`image-upload-container${images.length === 0 ? " image-upload-container--empty" : ""}`}>
        {images.map((image, index) => (
          <div className="sell-image-preview" key={`${image.url}-${index}`}>
            <img src={image.url} alt={`${label} preview ${index + 1}`} />
            <button type="button" className="remove-btn" onClick={() => onRemove(index, listingType)} aria-label={`Remove image ${index + 1}`}>×</button>
          </div>
        ))}
        {images.length < 6 && (
          <label className="upload-box" aria-label={`Add ${label.toLowerCase()}`}>
            <ImagePlus aria-hidden="true" />
            <span>Add photos</span>
            {images.length === 0 && <small>Choose up to 6 images</small>}
            <input type="file" accept="image/*" multiple onChange={(event) => onUpload(event, listingType)} hidden />
          </label>
        )}
      </div>
    </div>
  );
}

function ItemFields({ value, onChange }) {
  return (
    <div className="post-form-grid">
      <div className="form-group form-group--full">
        <label htmlFor="item-name">Item name</label>
        <input id="item-name" type="text" name="name" value={value.name} onChange={onChange} placeholder="What are you listing?" required />
      </div>
      <div className="form-group">
        <label htmlFor="item-category">Category</label>
        <select id="item-category" name="category" value={value.category} onChange={onChange} required>
          <option value="">Select category</option>
          <option value="Fashion & Accessories">Fashion & Accessories</option>
          <option value="Home & Living">Home & Living</option>
          <option value="Electronics">Electronics</option>
          <option value="Vehicles & Accessories">Vehicles & Accessories</option>
          <option value="Books & Study">Books & Study</option>
          <option value="Others">Others</option>
          <option value="Items">Items (existing listing)</option>
          <option value="Food">Food (existing listing)</option>
          <option value="Room">Room (existing listing)</option>
        </select>
      </div>
      <div className="form-group">
        <label htmlFor="item-price">Price (THB)</label>
        <input id="item-price" type="number" name="price" value={value.price} onChange={onChange} placeholder="0" min="0" step="1" inputMode="numeric" onKeyDown={preventInvalidNumberKeys} required />
      </div>
      <div className="form-group form-group--full">
        <label htmlFor="item-description">Description</label>
        <textarea id="item-description" name="description" value={value.description} onChange={onChange} placeholder="Condition, dimensions, pickup details…" rows="5" required />
      </div>
    </div>
  );
}

function AccommodationFields({ value, onChange }) {
  return (
    <div className="post-form-grid">
      <div className="form-group form-group--full">
        <label htmlFor="accommodation-title">Accommodation name</label>
        <input id="accommodation-title" type="text" name="title" value={value.title} onChange={onChange} placeholder="e.g. Campus View Studio" required />
      </div>
      <div className="form-group form-group--full">
        <label htmlFor="accommodation-location">Location</label>
        <input id="accommodation-location" type="text" name="location" value={value.location} onChange={onChange} placeholder="Area, district or nearby campus" required />
      </div>
      <div className="form-group">
        <label htmlFor="accommodation-type">Accommodation type</label>
        <select id="accommodation-type" name="accommodationType" value={value.accommodationType} onChange={onChange} required>
          <option value="">Select type</option>
          <option value="Private room">Private room</option>
          <option value="Shared room">Shared room</option>
          <option value="Studio">Studio</option>
          <option value="Apartment">Apartment</option>
          <option value="House share">House share</option>
          <option value="Dormitory">Dormitory</option>
        </select>
      </div>
      <div className="form-group">
        <label htmlFor="accommodation-bedrooms">Bedrooms <span className="field-note">Optional</span></label>
        <input id="accommodation-bedrooms" type="number" name="bedrooms" value={value.bedrooms} onChange={onChange} placeholder="0" min="0" step="1" inputMode="numeric" onKeyDown={preventInvalidNumberKeys} />
      </div>
      <div className="form-group">
        <label htmlFor="accommodation-price">Price (THB)</label>
        <input id="accommodation-price" type="number" name="price" value={value.price} onChange={onChange} placeholder="0" min="0" step="1" inputMode="numeric" onKeyDown={preventInvalidNumberKeys} required />
      </div>
      <div className="form-group">
        <label htmlFor="price-period">Price period</label>
        <select id="price-period" name="pricePeriod" value={value.pricePeriod} onChange={onChange} required>
          <option value="month">Per month</option>
          <option value="week">Per week</option>
          <option value="day">Per day</option>
          <option value="semester">Per semester</option>
        </select>
      </div>
      <div className="form-group form-group--full">
        <label htmlFor="accommodation-description">Description</label>
        <textarea id="accommodation-description" name="description" value={value.description} onChange={onChange} placeholder="Furniture, facilities, transport, house rules…" rows="5" required />
      </div>
    </div>
  );
}

export default Sell;
