import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { axiosInstance } from "../../lib/axios";
import ProfileAvatar from "../common/ProfileAvatar";
import { normalizeSeller } from "../../hooks/useItemsList";
import { formatListingPrice } from "../common/listingPrice";
import "../common/ListingPrice.css";
import { normalizeAccommodationSeller } from "../../hooks/useAccommodations";
import { resolveApiAssetUrl } from "../../config/api";
import "./ItemCardfromProfile.css";

function getCoverSrc(item) {
  const first = item?.images?.[0];
  const url = typeof first === "string" ? first : first?.url || "";
  if (!url) return "/Images/placeholder.png";
  return resolveApiAssetUrl(url, "/Images/placeholder.png");
}

export default function ItemCard({
  item,
  onDeleteItem,
  onArchiveChange,
  archiveMode = false,
}) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const deleteLockRef = useRef(false);
  const statusLockRef = useRef(false);
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const menuRef = useRef(null);

  const coverSrc = getCoverSrc(item);
  const title = item?.title || item?.name || "Untitled";
  const itemId = item?._id || item?.id;
  const isAccommodation = item?.listingType === "accommodation";
  const seller = isAccommodation
    ? normalizeAccommodationSeller(item)
    : normalizeSeller(item);
  const detailsPath = isAccommodation
    ? `/accommodations/${itemId}`
    : `/products/${itemId}`;

  const openListing = () => {
    if (itemId) navigate(detailsPath);
  };

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
    if (!confirmOpen && !statusConfirmOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape" && !isDeleting && !isUpdatingStatus) {
        setConfirmOpen(false);
        setStatusConfirmOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [confirmOpen, statusConfirmOpen, isDeleting, isUpdatingStatus]);

  const handleEdit = () => {
    setMenuOpen(false);
    navigate("/post", { state: { mode: "edit", item } });
  };

  const handleDeleteClick = () => {
    setMenuOpen(false);
    if (!itemId) return toast.error("Missing item id");
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemId || deleteLockRef.current) return;

    try {
      deleteLockRef.current = true;
      setIsDeleting(true);

      const resource = isAccommodation ? "accommodations" : "items";
      await axiosInstance.delete(`/${resource}/${itemId}`);

      toast.success("Listing deleted");
      setConfirmOpen(false);
      onDeleteItem?.(itemId);
    } catch (err) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || err?.message || "Delete failed"
      );
    } finally {
      deleteLockRef.current = false;
      setIsDeleting(false);
    }
  };

  const handleStatusChange = async () => {
    if (!itemId || statusLockRef.current) return;
    const nextStatus = archiveMode ? "active" : "sold";
    const resource = isAccommodation ? "accommodations" : "items";
    try {
      statusLockRef.current = true;
      setIsUpdatingStatus(true);
      await axiosInstance.patch(`/${resource}/${itemId}/status`, {
        status: nextStatus,
      });
      toast.success(
        archiveMode ? "Listing restored" : "Listing moved to Archive"
      );
      setMenuOpen(false);
      setStatusConfirmOpen(false);
      onArchiveChange?.(itemId);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Unable to update listing status"
      );
    } finally {
      statusLockRef.current = false;
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div
      className="profile-item-card"
      onClick={archiveMode ? undefined : openListing}
      onKeyDown={(event) => {
        if (!archiveMode && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          openListing();
        }
      }}
      role={archiveMode ? "article" : "link"}
      tabIndex={archiveMode ? undefined : 0}
    >
      <div className="profile-item-actions" ref={menuRef}>
        <button
          type="button"
          className="profile-kebab-btn"
          aria-label={`Open actions for ${title}`}
          aria-expanded={menuOpen}
          onClick={(event) => {
            event.stopPropagation();
            setMenuOpen((v) => !v);
          }}
          disabled={isDeleting || isUpdatingStatus}
        >
          ⋮
        </button>

        {menuOpen && (
          <div
            className="profile-kebab-menu"
            role="menu"
            aria-label={`Actions for ${title}`}
          >
            {!archiveMode && (
              <button
                type="button"
                className="profile-kebab-item"
                onClick={(event) => {
                  event.stopPropagation();
                  handleEdit();
                }}
                disabled={isDeleting || isUpdatingStatus}
              >
                Edit
              </button>
            )}
            {!archiveMode && (
              <button
                type="button"
                className="profile-kebab-item danger"
                onClick={(event) => {
                  event.stopPropagation();
                  handleDeleteClick();
                }}
                disabled={isDeleting || isUpdatingStatus}
              >
                Delete
              </button>
            )}
            <button
              type="button"
              className="profile-kebab-item"
              onClick={(event) => {
                event.stopPropagation();
                if (archiveMode) handleStatusChange();
                else {
                  setMenuOpen(false);
                  setStatusConfirmOpen(true);
                }
              }}
              disabled={isDeleting || isUpdatingStatus}
            >
              {isUpdatingStatus
                ? "Saving…"
                : archiveMode
                  ? "Restore listing"
                  : "Mark as done"}
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
        {archiveMode && (
          <span className="profile-item-sold-badge">Sold · Archived</span>
        )}
      </div>

      <div className="profile-item-body">
        <div className="profile-item-title-row listing-title-price-row">
          <h3 className="profile-item-title">{title}</h3>
          <p className="profile-item-price listing-price">
            {formatListingPrice(
              item?.price,
              isAccommodation ? item?.pricePeriod || "month" : undefined
            )}
          </p>
        </div>
        <p className="profile-item-kind">
          {isAccommodation ? "Accommodation" : "Item"}
          {isAccommodation && item?.pricePeriod
            ? ` · per ${item.pricePeriod}`
            : ""}
        </p>
        {seller?.fullName && (
          <div className="profile-item-seller">
            <ProfileAvatar
              className="profile-item-seller-photo"
              profilePic={seller.profilePic}
              alt={seller.fullName}
            />
            <span>{seller.fullName}</span>
          </div>
        )}
      </div>

      {/* Confirm Modal */}
      {confirmOpen && (
        <div
          className="confirm-overlay"
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => {
            event.stopPropagation();
            if (!isDeleting) setConfirmOpen(false);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="confirm-modal"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 className="confirm-title">Delete listing?</h3>
            <p className="confirm-text">
              Are you sure you want to delete this listing? <b>{title}</b> will
              be permanently removed.
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
      {statusConfirmOpen && (
        <div
          className="confirm-overlay"
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => {
            event.stopPropagation();
            if (!isUpdatingStatus) setStatusConfirmOpen(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`sold-confirm-${itemId}`}
        >
          <div
            className="confirm-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h3 className="confirm-title" id={`sold-confirm-${itemId}`}>
              Mark as sold?
            </h3>
            <p className="confirm-text">
              This will remove <b>{title}</b> from the marketplace and move it
              to your Archive.
            </p>
            <div className="confirm-actions">
              <button
                type="button"
                className="confirm-btn"
                onClick={() => setStatusConfirmOpen(false)}
                disabled={isUpdatingStatus}
              >
                Cancel
              </button>
              <button
                type="button"
                className="confirm-btn"
                onClick={handleStatusChange}
                disabled={isUpdatingStatus}
              >
                {isUpdatingStatus ? "Saving…" : "Yes, mark as sold"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
