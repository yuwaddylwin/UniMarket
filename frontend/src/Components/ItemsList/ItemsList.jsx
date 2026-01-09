import React from "react";
import "./ItemsList.css";
import { useItemsList } from "../Logics/useItemsList";
import { useNavigate } from "react-router-dom";

export default function ItemsList({ AddtoCart, cartItems }) {
  const { items } = useItemsList();
  const navigate = useNavigate();

  return (
    <div className="items-container">
      <h2>For You!</h2>
      <span className="link">View More</span>

      <div className="items-grid">
        {items.map((item) => (
          <div
            className="item-card"
            key={item._id}
            onClick={() => navigate(`/products/${item._id}`)}
            style={{ cursor: "pointer" }}
          >
            <img
              src={item?.images?.[0] || "/Images/placeholder.png"}
              alt={item.title}
            />

            <div className="item-content">
              <p className="price">{item.price} Baht</p>
              <h3>{item.title}</h3>
              <p>{item.description}</p>

              {/*  seller info (optional) */}
              {item?.seller?.fullName && (
                <p style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                  Seller: {item.seller.fullName}
                </p>
              )}
            </div>

            <div className="btns">
              <button
                onClick={(e) => {
                  e.stopPropagation(); //  prevent card navigation
                  AddtoCart(item);
                }}
              >
                Add to Cart 🛒
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation(); //  prevent card navigation
                  if (!item?.seller?.id) {
                    alert("Seller info not available for this item.");
                    return;
                  }
                  // Change this route to your chat route if needed:
                  navigate(`/chat/${item.seller.id}`);
                }}
              >
                Talk to Seller 💬
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
