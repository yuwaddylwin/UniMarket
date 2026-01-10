import React from "react";
import "./ItemCardfromProfile.css";

export default function ItemCard({ item }) {
  // supports: images = ["string"] OR images = [{ url: "string" }]
  const cover =
    Array.isArray(item?.images) && item.images.length > 0
      ? typeof item.images[0] === "string"
        ? item.images[0]
        : item.images[0]?.url
      : "";

  // supports: title from DB or name from old frontend
  const title = item?.title || item?.name || "Untitled";

  return (
    <div className="item-card">
      <div className="item-img">
        <img
          src={cover || "/Images/placeholder.png"}
          alt={title}
          onError={(e) => {
            e.currentTarget.src = "/Images/placeholder.png";
          }}
        />
      </div>

      <div className="item-body">
        <div className="item-title-row">
          <h3 className="item-title">{title}</h3>
          <p className="item-price">฿{Number(item?.price || 0).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
