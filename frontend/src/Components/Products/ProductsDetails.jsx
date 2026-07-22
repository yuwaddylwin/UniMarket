import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useItemsList } from "../Logics/useItemsList";
import { useNavigate } from "react-router-dom";
import "./ProductsDetails.css";
import { axiosInstance } from "../lib/axios";
import ProfileAvatar from "../common/ProfileAvatar";

function extractId(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value._id || value.id || value.userId || null;
}

export default function ItemPage({ AddtoCart }) {
  const { id } = useParams();
  const { items, loading } = useItemsList();
  const navigate = useNavigate();

  
  
  const item = useMemo(
    () => items.find((i) => String(i._id) === String(id)),
    [items, id]
  );
  const sellerId = useMemo(() => {
    // try item.seller first
    const fromSeller = extractId(item?.seller);
    if (fromSeller) return fromSeller;
  
    // fallback to item.user
    const fromUser = extractId(item?.user);
    return fromUser || null;
  }, [item]);

  // NEW: get current user from backend (cookie jwt)
  const [me, setMe] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await axiosInstance.get("/auth/me");
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

  const [currentImg, setCurrentImg] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const touchStartX = useRef(null);
  const didSwipe = useRef(false);

  useEffect(() => {
    setCurrentImg(0);
    setIsFullscreen(false); // close modal when changing item
  }, [id]);

  // close on ESC
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
    setCurrentImg((prev) => Math.min(prev + 1, images.length - 1));
  };

  const prevImage = () => {
    if (images.length <= 1) return;
    setCurrentImg((prev) => Math.max(prev - 1, 0));
  };

  const handleTouchStart = (event) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
    didSwipe.current = false;
  };

  const handleTouchEnd = (event) => {
    const startX = touchStartX.current;
    const endX = event.changedTouches[0]?.clientX;
    touchStartX.current = null;

    if (startX === null || endX === undefined) return;
    const distance = endX - startX;
    if (Math.abs(distance) < 48) return;

    didSwipe.current = true;
    if (distance < 0) nextImage();
    else prevImage();
  };

  const hasMultipleImages = images.length > 1;

  return (
    <main className="item-details-page">
      <div className="item-post">
      <button
        className="item-back-button"
        type="button"
        aria-label="Go back"
        onClick={() => navigate(-1)}
      >
        <span aria-hidden="true">←</span>
        <span>Back</span>
      </button>
      <div className="seller-info">
        <ProfileAvatar
          profilePic={seller?.profilePic}
          alt="Seller"
          className="seller-avatar"
        />
        <div>
          <p className="seller-name">{sellerName}</p>
          {isMine && <p className="seller-badge">My Listing</p>}
        </div>
      </div>

      <div
        className="carousel"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {hasMultipleImages && (
          <button
            className="nav-btn left"
            onClick={prevImage}
            disabled={currentImg === 0}
            type="button"
            aria-label="Previous image"
          >
            ‹
          </button>
        )}

        {images.length > 0 ? (
          <img
            key={currentImg}
            src={images[currentImg]}
            alt={item.title}
            className="carousel-image"
            onClick={() => {
              if (!didSwipe.current) setIsFullscreen(true);
              didSwipe.current = false;
            }}
            style={{ cursor: "zoom-in" }}
            onError={(e) => (e.currentTarget.src = "/no-image.png")}
          />
        ) : (
          <div className="no-image">No Image</div>
        )}

        {hasMultipleImages && (
          <button
            className="nav-btn right"
            onClick={nextImage}
            disabled={currentImg === images.length - 1}
            type="button"
            aria-label="Next image"
          >
            ›
          </button>
        )}
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
          <button
            className="talk-to-seller"
            type="button"
            onClick={() => {
              if (!sellerId) {
                alert("Seller info not available for this item.");
                return;
              }
              navigate(`/chat/${sellerId}`);
            }}
          >
            Talk to Seller 💬
          </button>
        )}

      </div>

      {/* Fullscreen*/}
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

    {hasMultipleImages && (
      <button
        className="nav-btn left"
        type="button"
        disabled={currentImg === 0}
        aria-label="Previous image"
        onClick={(e) => {
          e.stopPropagation();
          prevImage();
        }}
      >
        ‹
      </button>
    )}

    <img
      src={images[currentImg]}
      alt={item.title}
      className="fullscreen-image"
      onClick={(e) => e.stopPropagation()} // don't close when clicking image
      onError={(e) => (e.currentTarget.src = "/no-image.png")}
    />

    {hasMultipleImages && (
      <button
        className="nav-btn right"
        type="button"
        disabled={currentImg === images.length - 1}
        aria-label="Next image"
        onClick={(e) => {
          e.stopPropagation();
          nextImage();
        }}
      >
        ›
      </button>
    )}
  </div>
)}
</div>
    </main>
)}
