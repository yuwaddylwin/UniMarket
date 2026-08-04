import React, { useMemo } from "react";
import "./ItemsPage.css";
import { useItemsList } from "../Logics/useItemsList";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import LoadingSpinner from "../common/LoadingSpinner";
import ProfileAvatar from "../common/ProfileAvatar";

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
  const { items, isLoading, error } = useItemsList();
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

      {!isLoading && !error && searchQuery && matchedCount === 0 && (
        <div className="ip-result">
          <p className="ip-notfound">No matched item :(</p>
          <p className="ip-notfound-sub">
            Other items instead for: <b>{rawSearch}</b>
          </p>
        </div>
      )}

      <div className="ip-wrap">
        <div className="ip-row">
          {isLoading ? (
            <LoadingSpinner className="ip-loading" label="Loading items…" />
          ) : error ? (
            <div className="ip-state ip-state--error" role="alert">
              <strong>We couldn't load the items.</strong>
              <span>{error}</span>
            </div>
          ) : orderedItems.length === 0 ? (
            <p className="ip-state">No items found.</p>
          ) : (
            orderedItems.map((item) => (
              <div
                className="ip-card"
                key={item._id}
                onClick={() => navigate(`/products/${item._id}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    navigate(`/products/${item._id}`);
                  }
                }}
                role="link"
                tabIndex={0}
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
                <div className="ip-card-body">
                  <div className="ip-card-price">{item.price} Baht</div>
                  <h3>{item.title}</h3>
                  {item?.seller?.fullName && (
                    <div className="ip-seller">
                      <ProfileAvatar
                        profilePic={item.seller.profilePic}
                        alt=""
                        className="ip-seller-avatar"
                        loading="lazy"
                      />
                      <span>{item.seller.fullName}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
