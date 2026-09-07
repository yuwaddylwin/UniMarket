import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useSavedStore } from "../store/useSavedStore";
import SaveButton from "../common/SaveButton";
import SafetyDialog from "../common/SafetyDialog";
import { formatListingPrice } from "../common/listingPrice";
import { resolveApiAssetUrl } from "../../config/api";
import "./SavedPage.css";

function ownerId(listing) {
  const user = listing?.user || listing?.seller;
  return typeof user === "string" ? user : user?._id || user?.id;
}

export default function SavedPage() {
  const navigate = useNavigate();
  const authUser = useAuthStore(state => state.authUser);
  const { entries, loading, error, load } = useSavedStore();
  const [removingEntry, setRemovingEntry] = useState(null);
  return (
    <main className="saved-page">
      <header className="saved-page-header">
        <div><p className="saved-eyebrow">Your listings, kept together</p><h1>Saved</h1></div>
        <span className="saved-count">{entries.length} {entries.length === 1 ? "listing" : "listings"}</span>
      </header>
      {loading ? <p role="status">Loading saved listings…</p> : error ? (
        <div className="saved-empty" role="alert"><p>{error}</p><button type="button" onClick={load}>Try again</button></div>
      ) : entries.length === 0 ? (
        <div className="saved-empty">
          <h2>No saved listings yet</h2>
          <p>Save items and accommodation to find them here.</p>
          <button type="button" onClick={() => navigate("/")}>Browse listings</button>
        </div>
      ) : (
        <ul>{entries.map(entry => {
          const { listing, listingType, listingId } = entry;
          const accommodation = listingType === "accommodation";
          const path = `/${accommodation ? "accommodations" : "products"}/${listingId}`;
          const first = listing?.images?.[0];
          const image = typeof first === "string" ? first : first?.url;
          const sellerId = ownerId(listing);
          return <li key={`${listingType}:${listingId}`}>
            <img src={resolveApiAssetUrl(image, "/Images/placeholder.png")} alt={listing?.title || "Unavailable listing"}
              onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = "/Images/placeholder.png"; }} />
            <div className="saved-title">
              {listing ? <Link to={path}>{listing.title}</Link> : <span>Listing no longer available</span>}
              <small>{accommodation ? "Accommodation" : "Item"}{listing?.status === "sold" ? " · Sold" : ""}</small>
            </div>
            {listing && <span className="saved-price">{formatListingPrice(listing.price, accommodation ? listing.pricePeriod || "month" : undefined)}</span>}
            <div className="saved-page-btns">
              <SaveButton listing={listing} listingType={listingType} listingId={listingId} onUnsaveRequest={() => setRemovingEntry(entry)} />
              {listing && sellerId && sellerId !== authUser?._id && <button className="saved-chat-button" type="button" onClick={() => navigate(`/chat/${sellerId}`)}><MessageCircle size={18} aria-hidden="true" />Chat with Seller</button>}
            </div>
          </li>;
        })}</ul>
      )}
      {removingEntry && <SafetyDialog
        title="Remove from Saved?"
        description="Are you sure you want to remove this listing from Saved?"
        confirmLabel="Remove"
        onClose={() => setRemovingEntry(null)}
        onConfirm={async () => {
          const { listingType, listingId, listing } = removingEntry;
          const state = useSavedStore.getState();
          if (state.entries.some(entry => entry.listingType === listingType && entry.listingId === listingId)) {
            await state.toggle(listingType, listingId, listing);
          }
        }}
      />}
    </main>
  );
}
