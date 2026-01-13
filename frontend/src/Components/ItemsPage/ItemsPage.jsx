import React, { useMemo, useRef } from "react";
import "./ItemsPage.css";
import { useItemsList } from "../Logics/useItemsList";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";

const API_BASE ="http://localhost:8000";


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

export default function ItemsPage() {
  const { items } = useItemsList();
  const { authUser } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const scrollerRef = useRef(null);

  const rawSearch = searchParams.get("search") || "";
  const searchQuery = rawSearch.trim().toLowerCase();

  const baseItems = useMemo(() => {
    return items.filter((item) => {
      const sellerId = item?.seller?._id || item?.seller?.id;
      if (!authUser?._id || !sellerId) return true;
      return sellerId !== authUser._id;
    });
  }, [items, authUser?._id]);

  const { orderedItems, matchedCount } = useMemo(() => {
    if (!searchQuery) {
      return { orderedItems: baseItems, matchedCount: null };
    }

    const matches = [];
    const others = [];

    for (const item of baseItems) {
      const title = (item?.title || "").toLowerCase();
      const seller = (item?.seller?.fullName || "").toLowerCase();
      const isMatch = title.includes(searchQuery) || seller.includes(searchQuery);

      if (isMatch) matches.push(item);
      else others.push(item);
    }

    return {
      orderedItems: [...matches, ...others],
      matchedCount: matches.length,
    };
  }, [baseItems, searchQuery]);

  const scrollByFive = (dir) => {
    const el = scrollerRef.current;
    if (!el) return;

    const firstCard = el.querySelector(".ip-card");
    const cardW = firstCard?.getBoundingClientRect().width || 240;

    // match css gap 
    const gap = 16;
    const amount = (cardW + gap) * 5;

    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  return (
    <div className="ip-page">
      <div className="ip-header">
        <h2 className="ip-title">All Items</h2>

        {searchQuery && (
          <div className="ip-chip">
            Search: <b>{rawSearch}</b>
          </div>
        )}
      </div>

      {searchQuery && matchedCount === 0 && (
        <div className="ip-result">
          <p className="ip-notfound">No matched item :(</p>
          <p className="ip-notfound-sub">
            Other items instead for: <b>{rawSearch}</b>
          </p>
        </div>
      )}

      <div className="ip-wrap">
        <button
          className="ip-arrow ip-left"
          type="button"
          aria-label="Scroll left"
          onClick={() => scrollByFive(-1)}
        >
          ←
        </button>

        <div className="ip-row" ref={scrollerRef}>
          {orderedItems.length === 0 ? (
            <p style={{ padding: 12 }}>No items to show.</p>
          ) : (
            orderedItems.map((item) => (
              <div
                className="ip-card"
                key={item._id}
                onClick={() => navigate(`/products/${item._id}`)}
              >
                <div className="ip-img">
                  <img
                    src={getFirstImageSrc(item)}
                    alt={item.title}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = "/Images/placeholder.png";
                    }}
                  />
                </div>

                <div className="ip-body">
                  <h3 className="ip-card-title">{item.title}</h3>

                  {item?.seller?.fullName && (
                    <div className="ip-seller">
                      {item?.seller?.profilePic && (
                        <img
                          className="ip-seller-pic"
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
                      <span className="ip-seller-name">{item.seller.fullName}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <button
          className="ip-arrow ip-right"
          type="button"
          aria-label="Scroll right"
          onClick={() => scrollByFive(1)}
        >
          →
        </button>
      </div>
    </div>
  );
}
