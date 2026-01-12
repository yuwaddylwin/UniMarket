import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import "./ItemCardfromProfile.css";

const API_BASE = "http://localhost:8000";

async function getErrorMessage(res) {
  const contentType = res.headers.get("content-type") || "";
  if (res.status === 204) return "";
  if (contentType.includes("application/json")) {
    const data = await res.json().catch(() => null);
    return data?.message || "Request failed";
  }
  const text = await res.text().catch(() => "");
  return text || "Request failed";
}

function getCoverSrc(item) {
  const first = item?.images?.[0];
  const url = typeof first === "string" ? first : first?.url || "";
  if (!url) return "/Images/placeholder.png";
  if (url.startsWith("/uploads/")) return `${API_BASE}${url}`;
  return url;
}

export default function ItemCard({ item, onDeleteItem }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef(null);

  const coverSrc = getCoverSrc(item);
  const title = item?.title || item?.name || "Untitled";
  const itemId = item?._id || item?.id;

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

    if (!itemId) {
      toast.error("Missing item id");
      return;
    }

    const ok = window.confirm("Delete this item?");
    if (!ok) return;

    try {
      setIsDeleting(true);

      const res = await fetch(`${API_BASE}/api/items/${itemId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) throw new Error(await getErrorMessage(res));

      toast.success("Item deleted");
      onDeleteItem?.(itemId); // ✅ only UI update
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Delete failed");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="profile-item-card">
      <div className="profile-item-actions" ref={menuRef}>
        <button
          type="button"
          className="profile-kebab-btn"
          onClick={() => setMenuOpen((v) => !v)}
          disabled={isDeleting}
        >
          ⋮
        </button>

        {menuOpen && (
          <div className="profile-kebab-menu" role="menu">
            <button type="button" className="profile-kebab-item" onClick={handleEdit} disabled={isDeleting}>
              Edit
            </button>
            <button type="button" className="profile-kebab-item danger" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        )}
      </div>

      <div className="profile-item-img">
        <img
          src={coverSrc}
          alt={title}
          onError={(e) => (e.currentTarget.src = "/Images/placeholder.png")}
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
