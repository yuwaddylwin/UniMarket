import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useItemsList } from "../Logics/useItemsList";
import "./ProductsDetails.css";

export default function ItemPage({ AddtoCart }) {
  const { id } = useParams();
  const { items } = useItemsList();
  const item = items.find((i) => i._id === id);

  const [currentImg, setCurrentImg] = useState(0);

  if (!item) return <p>Loading...</p>;

  // Ensure item.image is an array of image URLs
  const images = Array.isArray(item.image) ? item.image : [item.image];

  const nextImage = () => {
    setCurrentImg((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
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
        />
        <div>
          <p className="seller-name">{item.sellerName || "Seller Account"}</p>
        </div>
      </div>

      {/* Image Carousel */}
      <div className="carousel">
        <button className="nav-btn left" onClick={prevImage}>
          ‹
        </button>
        <img
          src={images[currentImg]}
          alt={item.title}
          className="carousel-image"
        />
        <button className="nav-btn right" onClick={nextImage}>
          ›
        </button>

        <div className="dots-container">
          {images.map((_, index) => (
            <span
              key={index}
              className={`dot ${index === currentImg ? "active" : ""}`}
              onClick={() => setCurrentImg(index)}
            ></span>
          ))}
        </div>
      </div>
      
      {/* Description */}
      <div className="item-details">
        <h3 className="item-title">{item.title}</h3>
        <p className="item-price">{item.price} Baht</p>
        <p className="item-description">{item.description}</p>
      </div>

      {/* Buttons */}
      <div className="bottom-buttons">
        <button className="add-to-cart" onClick={() => AddtoCart(item)}>
          Add to Cart 🛒
        </button>
        <button className="talk-to-seller">Talk to Seller 💬</button>
      </div>
    </div>
  );
}
