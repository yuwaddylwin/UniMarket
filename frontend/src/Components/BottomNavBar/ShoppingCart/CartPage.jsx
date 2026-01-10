import React from "react";
import "./CartPage.css";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom"; 

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
            // FIX IMAGE SOURCE
            const imageSrc = item?.images?.[0] || item?.image || "/no-image.png";

            // seller id (support seller._id or seller.id)
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
