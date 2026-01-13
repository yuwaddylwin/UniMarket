import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import "./ItemCardfromProfile.css";

const API_BASE =
  process.env.REACT_APP_API_URL || "http://localhost:8000";


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
  const [confirmOpen, setConfirmOpen] = useState(false);
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

  // Close modal on ESC
  useEffect(() => {
    if (!confirmOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setConfirmOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [confirmOpen]);

  const handleEdit = () => {
    setMenuOpen(false);
    navigate("/sell", { state: { mode: "edit", item } });
  };

  const handleDeleteClick = () => {
    setMenuOpen(false);
    if (!itemId) return toast.error("Missing item id");
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemId) return;

    try {
      setIsDeleting(true);

      const res = await fetch(`${API_BASE}/api/items/${itemId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) throw new Error(await getErrorMessage(res));

      toast.success("Item deleted");
      setConfirmOpen(false);
      onDeleteItem?.(itemId);
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
            <button
              type="button"
              className="profile-kebab-item"
              onClick={handleEdit}
              disabled={isDeleting}
            >
              Edit
            </button>
            <button
              type="button"
              className="profile-kebab-item danger"
              onClick={handleDeleteClick}
              disabled={isDeleting}
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

      {/* Confirm Modal */}
      {confirmOpen && (
        <div
          className="confirm-overlay"
          onMouseDown={() => !isDeleting && setConfirmOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="confirm-modal"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 className="confirm-title">Are you sure?</h3>
            <p className="confirm-text">
              This will permanently delete <b>{title}</b>.
            </p>

            <div className="confirm-actions">
              <button
                type="button"
                className="confirm-btn"
                onClick={() => setConfirmOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="confirm-btn danger"
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
