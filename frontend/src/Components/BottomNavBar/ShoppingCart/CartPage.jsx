import React from "react";
import "./CartPage.css";
import toast from "react-hot-toast";

export default function CartPage({ cartItems, setCartItems }) {
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
            // ✅ FIX IMAGE SOURCE
            const imageSrc =
              item?.images?.[0] ||
              item?.image ||
              "/no-image.png";

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
                  <button className="talk-btn">Talk to Seller 💬</button>
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
