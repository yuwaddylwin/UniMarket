import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { useItemsList } from "../Logics/useItemsList";
import "./ProductsDetails.css";

function extractId(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value._id || value.id || value.userId || null;
}

export default function ItemPage({ AddtoCart }) {
  const { id } = useParams();
  const { items, loading } = useItemsList();

  const item = useMemo(
    () => items.find((i) => String(i._id) === String(id)),
    [items, id]
  );

  // NEW: get current user from backend (cookie jwt)
  const [me, setMe] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await axios.get("http://localhost:8000/api/auth/me", {
          withCredentials: true,
        });
        if (mounted) setMe(res.data);
      } catch (e) {
        if (mounted) setMe(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const currentUserId = useMemo(() => extractId(me), [me]);

  // images
  const images = useMemo(() => {
    if (Array.isArray(item?.images) && item.images.length > 0) return item.images;
    if (item?.image) return [item.image];
    return [];
  }, [item]);

  // seller
  const seller = item?.seller || (typeof item?.user === "object" ? item.user : null);

  const ownerId = useMemo(() => {
    const fromUser = extractId(item?.user);
    if (fromUser) return fromUser;

    const fromSeller = extractId(seller?.id || seller?._id || seller);
    return fromSeller || null;
  }, [item, seller]);

  const isMine = useMemo(() => {
    if (!currentUserId || !ownerId) return false;
    return String(currentUserId) === String(ownerId);
  }, [currentUserId, ownerId]);

  const sellerName = isMine
    ? ""
    : seller?.fullName || seller?.name || seller?.username || "Seller Account";

  const sellerPic = seller?.profilePic || "/default-avatar.png";

  const [currentImg, setCurrentImg] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    setCurrentImg(0);
    setIsFullscreen(false); // close modal when changing item
  }, [id]);

  // Optional: close on ESC
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    if (isFullscreen) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFullscreen]);

  if (loading && !item) return <p>Loading...</p>;
  if (!item) return <p>Item not found.</p>;

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
      <div className="seller-info">
        <img
          src={sellerPic}
          alt="Seller"
          className="seller-avatar"
          onError={(e) => (e.currentTarget.src = "/default-avatar.png")}
        />
        <div>
          <p className="seller-name">{sellerName}</p>
          {isMine && <p className="seller-badge">My Listing</p>}
        </div>
      </div>

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
      </div>

      <div className="item-details">
        <h3 className="item-title">{item.title}</h3>
        <p className="item-price">{item.price} Baht</p>
        <p className="item-description">{item.description}</p>
      </div>

      <div className="bottom-buttons">
        {!isMine && (
          <button className="add-to-cart" onClick={() => AddtoCart(item)} type="button">
            Add to Cart 🛒
          </button>
        )}

        {!isMine && (
          <button className="talk-to-seller" type="button">
            Talk to Seller 💬
          </button>
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

    <button
      className="nav-btn left"
      type="button"
      disabled={images.length <= 1}
      onClick={(e) => {
        e.stopPropagation();
        prevImage();
      }}
    >
      ‹
    </button>

    <img
      src={images[currentImg]}
      alt={item.title}
      className="fullscreen-image"
      onClick={(e) => e.stopPropagation()} // don't close when clicking image
      onError={(e) => (e.currentTarget.src = "/no-image.png")}
    />

    <button
      className="nav-btn right"
      type="button"
      disabled={images.length <= 1}
      onClick={(e) => {
        e.stopPropagation();
        nextImage();
      }}
    >
      ›
    </button>
  </div>
)}
</div>
)}