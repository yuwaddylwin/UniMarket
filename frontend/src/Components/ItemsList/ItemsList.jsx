import React from "react";
import "./ItemsList.css";
import { useItemsList } from "../Logics/useItemsList";

export default function ItemsList({ AddtoCart, cartItems }) {
  const { items } = useItemsList();

  return (
    <div className="items-container">
      <h2>For You!</h2>
      <span className="link">View More</span>

      <div className="items-grid">
        {items.map((item) => (
          <div className="item-card" key={item._id}>
            <img src={item.image} alt={item.title} />
            <div className="item-content">
              <p className="price">{item.price} Baht</p>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </div>
            <div className="btns">
              <button
                onClick={() => AddtoCart(item)}
                disabled={cartItems.some(
                  (cartItem) => cartItem._id === item._id
                )}
              >
                Add to Cart 🛒
              </button>
              <button>Talk to Seller 💬</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
