import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ItemCardfromProfile.css";

const API_BASE = "http://localhost:8000";

function getCoverSrc(item) {
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

export default function ItemCard({ item, onDeleteItem }) {
  const navigate = useNavigate();

  const coverSrc = getCoverSrc(item);

  const title = item?.title || item?.name || "Untitled";
  const itemId = item?._id || item?.id;

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const handleEdit = () => {
    setMenuOpen(false);
    navigate("/sell", { state: { mode: "edit", item } });
  };

  const handleDelete = async () => {
    setMenuOpen(false);
    if (!itemId) return;

    const ok = window.confirm("Delete this item?");
    if (!ok) return;

    await onDeleteItem?.(itemId);
  };

  return (
    <div className="profile-item-card">
      <div className="profile-item-actions" ref={menuRef}>
        <button
          type="button"
          className="profile-kebab-btn"
          aria-label="Item options"
          onClick={() => setMenuOpen((v) => !v)}
        >
          ⋮
        </button>

        {menuOpen && (
          <div className="profile-kebab-menu" role="menu">
            <button
              type="button"
              className="profile-kebab-item"
              onClick={handleEdit}
            >
              Edit
            </button>
            <button
              type="button"
              className="profile-kebab-item danger"
              onClick={handleDelete}
            >
              Delete
            </button>
          </div>
        )}
      </div>

      <div className="profile-item-img">
        <img
          src={coverSrc}
          alt={title}
          onError={(e) => {
            e.currentTarget.src = "/Images/placeholder.png";
          }}
        />
      </div>

      <div className="profile-item-body">
        <div className="profile-item-title-row">
          <h3 className="profile-item-title">{title}</h3>
          <p className="profile-item-price">
            ฿{Number(item?.price || 0).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
