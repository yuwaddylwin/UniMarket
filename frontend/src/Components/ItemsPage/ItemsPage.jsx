import React, { useMemo } from "react";
import "./ItemsPage.css";
import { useItemsList } from "../Logics/useItemsList";
import { useNavigate, useSearchParams } from "react-router-dom";
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

export default function ItemsPage() {
  const { items } = useItemsList();
  const { authUser } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

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
        <div className="ip-row">
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

              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
