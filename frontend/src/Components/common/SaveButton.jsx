import { Bookmark } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { savedKey, useSavedStore } from "../store/useSavedStore";
import "./SaveButton.css";

export default function SaveButton({ listingType, listingId, compact = false, listing = null, onUnsaveRequest }) {
  const user = useAuthStore(state => state.authUser);
  const { entries, userId, pending, toggle } = useSavedStore();
  const navigate = useNavigate();
  const location = useLocation();
  const key = savedKey(listingType, listingId);
  const saved = user?._id === userId && entries.some(entry => savedKey(entry.listingType, entry.listingId) === key);
  return <button type="button" className={`save-listing-button${saved ? " is-saved" : ""}${compact ? " is-compact" : ""}`}
    aria-label="Save" aria-pressed={saved}
    disabled={Boolean(user && pending[key])} aria-busy={Boolean(user && pending[key])}
    onKeyDown={event => event.stopPropagation()}
    onClick={event => {
      event.stopPropagation();
      if (!user) return navigate("/login", { state: { from: `${location.pathname}${location.search}` } });
      if (saved && onUnsaveRequest) return onUnsaveRequest();
      toggle(listingType, listingId, listing);
    }}>
    <Bookmark size={18} fill={saved ? "currentColor" : "none"} aria-hidden="true" />
    {!compact && "Save"}
  </button>;
}
