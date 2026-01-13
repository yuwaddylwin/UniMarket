import React, { useEffect, useRef, useState } from "react";
import "./ItemsList.css";
import { useItemsList } from "../Logics/useItemsList";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";

const API_BASE = "http://localhost:8000";

function getFirstImageSrc(item) {
  const first = item?.images?.[0];

  let url =
    typeof first === "string"
      ? first
      : typeof first === "object"
      ? first?.url
      : "";

  if (!url) return "/Images/placeholder.png";
  if (url.startsWith("/uploads/")) return `${API_BASE}${url}`;
  return url;
}

export default function ItemsList({ AddtoCart }) {
  const { items } = useItemsList();
  const { authUser } = useAuthStore();
  const navigate = useNavigate();

  const scrollerRef = useRef(null);
  const [showArrows, setShowArrows] = useState(false);

  // show arrows only on tablet/laptop/PC
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 600px)");
    const update = () => setShowArrows(mq.matches);
    update();

    // support older browsers
    if (mq.addEventListener) mq.addEventListener("change", update);
    else mq.addListener(update);

    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", update);
      else mq.removeListener(update);
    };
  }, []);

  const filteredItems = items.filter((item) => {
    const sellerId = item?.seller?._id || item?.seller?.id;
    if (!authUser?._id || !sellerId) return true;
    return sellerId !== authUser._id;
  });

  const scrollByCards = (dir) => {
    const el = scrollerRef.current;
    if (!el) return;

    const firstCard = el.querySelector(".item-card");
    const cardW = firstCard?.getBoundingClientRect().width || 280;

    // CSS gaps: 12 mobile, 14 tablet, 16 desktop
    const gap = window.matchMedia("(min-width: 900px)").matches
      ? 16
      : window.matchMedia("(min-width: 600px)").matches
      ? 14
      : 12;

    // scroll about 2 cards at a time for ItemsList 
    const amount = (cardW + gap) * 2;

    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  return (
    <div className="items-container">
      <div className="items-header">
        <h2>For You!</h2>
        <span className="link" onClick={() => navigate("/products")}>
          View More
        </span>
      </div>

      <div className="il-wrap">
        {showArrows && (
          <button
            className="il-arrow il-left"
            type="button"
            aria-label="Scroll left"
            onClick={() => scrollByCards(-1)}
          >
            ←
          </button>
        )}

        <div className="items-grid" ref={scrollerRef}>
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
                    src={getFirstImageSrc(item)}
                    alt={item.title}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = "/Images/placeholder.png";
                    }}
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
                          src={
                            item.seller.profilePic.startsWith("/uploads/")
                              ? `${API_BASE}${item.seller.profilePic}`
                              : item.seller.profilePic
                          }
                          alt={item.seller.fullName}
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
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

                          if (!authUser) {
                            navigate("/login");
                            return; 
                          }

                          AddtoCart(item);
                        }}
                        type="button"
                      >
                        ADD TO CART 🛒
                      </button>

                      <button
                        className="btn secondary"
                        onClick={(e) => {
                          e.stopPropagation();

                          if (!authUser) {
                            navigate("/login");
                            return; 
                          }

                          const sellerId = item?.seller?._id || item?.seller?.id;
                          if (!sellerId) {
                            alert("Seller info not available for this item.");
                            return;
                          }

                          navigate(`/chat/${sellerId}`);
                        }}
                        type="button"
                      >
                        TALK TO SELLER 💬
                      </button>

                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {showArrows && (
          <button
            className="il-arrow il-right"
            type="button"
            aria-label="Scroll right"
            onClick={() => scrollByCards(1)}
          >
            →
          </button>
        )}
      </div>
    </div>
  );
}
