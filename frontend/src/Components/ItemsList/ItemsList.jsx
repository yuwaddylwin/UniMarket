import React from "react";
import "./ItemsList.css";
import { useItemsList } from "../Logics/useItemsList";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";

export default function ItemsList({ AddtoCart }) {
  const { items } = useItemsList();
  const { authUser } = useAuthStore();
  const navigate = useNavigate();

  const filteredItems = items.filter((item) => {
    const sellerId = item?.seller?._id || item?.seller?.id;
    if (!authUser?._id || !sellerId) return true; // keep if unknown
    return sellerId !== authUser._id; // hide own items
  });

  return (
    <div className="items-container">
      <div className="items-header">
        <h2>For You!</h2>
        <span className="link" onClick={() => navigate("/products")}>
          View More
        </span>
      </div>

      <div className="items-grid">
        {filteredItems.length === 0 ? (
          <p>No items to show.</p>
        ) : (
          filteredItems.map((item) => (
            <div
              className="item-card"
              key={item._id}
              onClick={() => navigate(`/products/${item._id}`)}
              style={{ cursor: "pointer" }}
            >
              <div className="item-img">
                <img
                  src={item?.images?.[0] || "/Images/placeholder.png"}
                  alt={item.title}
                  loading="lazy"
                />
              </div>

              <div className="item-body">
                <div className="item-price">{item.price} Baht</div>
                <h3 className="item-title">{item.title}</h3>

                {item?.seller?.fullName && (
                  <div className="seller-row">
                    {item?.seller?.profilePic && (
                      <img
                        className="seller-pic"
                        src={item.seller.profilePic}
                        alt={item.seller.fullName}
                        loading="lazy"
                      />
                    )}
                    <span className="seller-name">
                      Seller: {item.seller.fullName}
                    </span>
                  </div>
                )}

                <p className="item-desc">{item.description}</p>

                <div className="item-actions">
                  <button
                    className="btn primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      AddtoCart(item);
                    }}
                  >
                    ADD TO CART 🛒
                  </button>

                  <button
                    className="btn secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      const sellerId = item?.seller?._id || item?.seller?.id;
                      if (!sellerId) {
                        alert("Seller info not available for this item.");
                        return;
                      }
                      navigate(`/chat/${sellerId}`);
                    }}
                  >
                    TALK TO SELLER 💬
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
