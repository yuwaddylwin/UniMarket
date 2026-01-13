import React from "react";
import "./CartPage.css";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const API_BASE = process.env.REACT_APP_API_BASE_URL;


function getFirstImageSrc(item) {
  const first = item?.images?.[0];

  let url =
    typeof first === "string"
      ? first
      : typeof first === "object"
      ? first?.url
      : "";

  if (!url) url = item?.image || "";

  if (!url) return "/no-image.png";

  if (url.startsWith("/uploads/")) return `${API_BASE}${url}`;

  return url;
}

export default function CartPage({ cartItems, setCartItems }) {
  const navigate = useNavigate();

  const handleDelete = (id) => {
    const updated = cartItems.filter((item) => item._id !== id);
    setCartItems(updated);
    toast.error("Item removed!");
  };

  return (
    <div className="cart-page">
      <h2>Your Cart</h2>

      {cartItems.length === 0 ? (
        <p>Nothing is in your cart.</p>
      ) : (
        <ul>
          {cartItems.map((item) => {
            const imageSrc = getFirstImageSrc(item);
            const sellerId = item?.seller?._id || item?.seller?.id;

            return (
              <li key={item._id}>
                <img
                  src={imageSrc}
                  alt={item.title}
                  width="50"
                  onError={(e) => (e.currentTarget.src = "/no-image.png")}
                />

                <span className="cart-title">{item.title}</span>
                <span className="cart-price">{item.price} Baht</span>

                <div className="cart-page-btns">
                  <button
                    className="talk-btn"
                    type="button"
                    onClick={() => {
                      if (!sellerId) {
                        toast.error("Seller info not available for this item.");
                        return;
                      }
                      navigate(`/chat/${sellerId}`);
                    }}
                  >
                    Talk to Seller 💬
                  </button>

                  <button
                    className="delete-btn"
                    onClick={() => handleDelete(item._id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
