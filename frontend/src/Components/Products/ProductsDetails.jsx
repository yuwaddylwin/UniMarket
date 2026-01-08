// src/Components/ProductsDetails/ItemPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useItemsList } from "../Logics/useItemsList";
import "./ProductsDetails.css";

export default function ItemPage({ AddtoCart }) {
  const { id } = useParams();
  const { items } = useItemsList();
  const item = items.find((i) => i._id === id);

  const images = useMemo(() => {
    if (Array.isArray(item?.images) && item.images.length > 0) return item.images;
    if (item?.image) return [item.image];
    return [];
  }, [item]);

  const [currentImg, setCurrentImg] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    setCurrentImg(0);
  }, [id]);

  // Close fullscreen on ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };

    if (isFullscreen) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isFullscreen]);

  if (!item) return <p>Loading...</p>;

  const nextImage = () => {
    if (images.length <= 1) return;
    setCurrentImg((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    if (images.length <= 1) return;
    setCurrentImg((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="item-post">
      {/* Seller Info */}
      <div className="seller-info">
        <img
          src={item.sellerImage || "/default-avatar.png"}
          alt="Seller"
          className="seller-avatar"
          onError={(e) => (e.currentTarget.src = "/default-avatar.png")}
        />
        <div>
          <p className="seller-name">{item.sellerName || "Seller Account"}</p>
        </div>
      </div>

      {/* Image Carousel */}
      <div className="carousel">
        <button
          className="nav-btn left"
          onClick={prevImage}
          disabled={images.length <= 1}
          type="button"
        >
          ‹
        </button>

        {images.length > 0 ? (
          <img
            src={images[currentImg]}
            alt={item.title}
            className="carousel-image"
            onClick={() => setIsFullscreen(true)}
            style={{ cursor: "zoom-in" }}
            onError={(e) => (e.currentTarget.src = "/no-image.png")}
          />
        ) : (
          <div className="no-image">No Image</div>
        )}

        <button
          className="nav-btn right"
          onClick={nextImage}
          disabled={images.length <= 1}
          type="button"
        >
          ›
        </button>

        {images.length > 1 && (
          <div className="dots-container">
            {images.map((_, index) => (
              <span
                key={index}
                className={`dot ${index === currentImg ? "active" : ""}`}
                onClick={() => setCurrentImg(index)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && images.length > 0 && (
        <div
          className="fullscreen-overlay"
          onClick={() => setIsFullscreen(false)}
          role="dialog"
          aria-modal="true"
        >
          {/* Close */}
          <button
            className="close-btn"
            type="button"
            aria-label="Close"
            onClick={(e) => {
              e.stopPropagation();
              setIsFullscreen(false);
            }}
          >
            ×
          </button>

          {/* Left / Right inside overlay */}
          <button
            className="fs-nav-btn fs-left"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prevImage();
            }}
            disabled={images.length <= 1}
            aria-label="Previous image"
          >
            ‹
          </button>

          <img
            src={images[currentImg]}
            alt="Full View"
            className="fullscreen-image"
            onClick={(e) => e.stopPropagation()}
            onError={(e) => (e.currentTarget.src = "/no-image.png")}
          />

          <button
            className="fs-nav-btn fs-right"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              nextImage();
            }}
            disabled={images.length <= 1}
            aria-label="Next image"
          >
            ›
          </button>
        </div>
      )}

      {/* Description */}
      <div className="item-details">
        <h3 className="item-title">{item.title}</h3>
        <p className="item-price">{item.price} Baht</p>
        <p className="item-description">{item.description}</p>
      </div>

      {/* Buttons */}
      <div className="bottom-buttons">
        <button className="add-to-cart" onClick={() => AddtoCart(item)} type="button">
          Add to Cart 🛒
        </button>
        <button className="talk-to-seller" type="button">
          Talk to Seller 💬
        </button>
      </div>
    </div>
  );
}
