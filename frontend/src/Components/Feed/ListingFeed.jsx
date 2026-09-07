import SaveButton from "../common/SaveButton";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  MessageCircle,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import ProfileAvatar from "../common/ProfileAvatar";
import LoadingSpinner from "../common/LoadingSpinner";
import { formatListingPrice } from "../common/listingPrice";
import { useAuthStore } from "../store/useAuthStore";
import FeedDescription from "./FeedDescription";
import "../common/ListingPrice.css";
import "./ListingFeed.css";

const ITEM_PLACEHOLDER = "/Images/placeholder.png";
const ACCOMMODATION_PLACEHOLDER = "/Images/unimarket/accommodation.jpg";

function extractId(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value._id || value.id || value.userId || null;
}

export function orderSelectedFirst(listings, selectedId) {
  const list = Array.isArray(listings) ? listings : [];
  const selectedIndex = list.findIndex(
    (listing) => String(listing?._id || listing?.id) === String(selectedId)
  );
  if (selectedIndex <= 0) return list;
  return [
    list[selectedIndex],
    ...list.slice(0, selectedIndex),
    ...list.slice(selectedIndex + 1),
  ];
}

function getOwnerId(listing) {
  return extractId(listing?.user) || extractId(listing?.seller);
}

export default function ListingFeed({
  listings,
  selectedId,
  listingType,
  isLoading,
  error,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const authUser = useAuthStore((state) => state.authUser);
  const currentUserId = extractId(authUser);
  const orderedListings = useMemo(
    () => orderSelectedFirst(listings, selectedId),
    [listings, selectedId]
  );
  const selectedExists = orderedListings.some(
    (listing) => String(listing?._id || listing?.id) === String(selectedId)
  );
  const isAccommodation = listingType === "accommodation";

  const requireAuthentication = () => {
    if (authUser) return true;
    toast("Please log in to continue.");
    navigate("/login", {
      state: { from: `${location.pathname}${location.search}` },
    });
    return false;
  };

  const handleChat = (listing) => {
    if (!requireAuthentication()) return;
    const ownerId = getOwnerId(listing);
    if (!ownerId) {
      toast.error("Seller information is unavailable.");
      return;
    }
    if (String(ownerId) === String(currentUserId)) return;
    navigate(`/chat/${ownerId}`);
  };


  return (
    <main className="listing-feed-page">
      {isLoading ? (
        <LoadingSpinner className="listing-feed-state" label={`Loading ${isAccommodation ? "accommodation" : "items"}…`} />
      ) : error ? (
        <div className="listing-feed-state listing-feed-state--error" role="alert">
          <strong>We couldn't load this feed.</strong>
          <span>{error}</span>
        </div>
      ) : orderedListings.length === 0 ? (
        <div className="listing-feed-state">
          <strong>No listings available.</strong>
          <span>New posts will appear here.</span>
        </div>
      ) : (
        <div className="listing-feed" aria-label={`${isAccommodation ? "Accommodation" : "Item"} listings`}>
          {!selectedExists && (
            <div className="listing-feed-missing" role="status">
              The selected listing is no longer available. Showing other current listings.
            </div>
          )}
          {orderedListings.map((listing) => {
            const ownerId = getOwnerId(listing);
            const isMine = Boolean(
              currentUserId && ownerId && String(currentUserId) === String(ownerId)
            );
            return (
              <ListingFeedPost
                key={listing._id || listing.id}
                listing={listing}
                listingType={listingType}
                isMine={isMine}
                onChat={() => handleChat(listing)}
              />
            );
          })}
        </div>
      )}
    </main>
  );
}

function ListingFeedPost({ listing, listingType, isMine, onChat }) {
  const isAccommodation = listingType === "accommodation";
  const seller = listing?.seller || (typeof listing?.user === "object" ? listing.user : null);
  const sellerName = seller?.fullName || seller?.name || seller?.username || "Seller";
  const images = useMemo(() => {
    const normalized = Array.isArray(listing?.images)
      ? listing.images
          .map((image) => (typeof image === "string" ? image : image?.url))
          .filter(Boolean)
      : [];
    return normalized.length
      ? normalized
      : [isAccommodation ? ACCOMMODATION_PLACEHOLDER : ITEM_PLACEHOLDER];
  }, [listing?.images, isAccommodation]);
  const [activeImage, setActiveImage] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const touchStart = useRef(null);
  const didSwipe = useRef(false);
  useEffect(() => {
    setActiveImage(0);
    setFullscreen(false);
  }, [listing?._id]);

  useEffect(() => {
    if (!fullscreen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [fullscreen]);

  const showPrevious = () => setActiveImage((index) => Math.max(0, index - 1));
  const showNext = () => setActiveImage((index) => Math.min(images.length - 1, index + 1));
  const handleTouchEnd = (event) => {
    const endX = event.changedTouches[0]?.clientX;
    const endY = event.changedTouches[0]?.clientY;
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || endX === undefined || endY === undefined) return;
    const distanceX = endX - start.x;
    const distanceY = endY - start.y;
    if (Math.abs(distanceX) < 45 || Math.abs(distanceX) <= Math.abs(distanceY) * 1.15) return;
    didSwipe.current = true;
    if (distanceX < 0) showNext();
    else showPrevious();
  };

  const openFullscreen = () => {
    if (didSwipe.current) {
      didSwipe.current = false;
      return;
    }
    setFullscreen(true);
  };
  const closeFullscreen = () => {
    didSwipe.current = false;
    setFullscreen(false);
  };

  const price = formatListingPrice(
    listing?.price,
    isAccommodation ? listing.pricePeriod || "month" : undefined
  );
  const meta = isAccommodation ? listing.location : null;

  return (
    <article className="listing-feed-post" data-listing-id={listing._id || listing.id}>
      <header className="listing-feed-owner">
        <ProfileAvatar
          className="listing-feed-avatar"
          profilePic={seller?.profilePic}
          alt={sellerName}
        />
        <div>
          <strong>{sellerName}</strong>
          {meta && <span>{isAccommodation && <MapPin size={12} aria-hidden="true" />}{meta}</span>}
        </div>
        {isMine && <span className="listing-feed-owner-badge">My Listing</span>}
      </header>

      <div
        className="listing-feed-gallery"
        onTouchStart={(event) => {
          const touch = event.touches[0];
          touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
          didSwipe.current = false;
        }}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={() => { touchStart.current = null; }}
      >
        <div
          className="listing-feed-gallery-track"
          style={{ transform: `translate3d(-${activeImage * 100}%, 0, 0)` }}
          onClick={openFullscreen}
        >
          {images.map((image, index) => (
            <div className="listing-feed-gallery-slide" key={`${image}-${index}`} aria-hidden={index !== activeImage}>
              <img
                src={image}
                alt={`${listing.title || "Listing"} ${index + 1}`}
                draggable="false"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = isAccommodation ? ACCOMMODATION_PLACEHOLDER : ITEM_PLACEHOLDER;
                }}
              />
            </div>
          ))}
        </div>
        {images.length > 1 && <>
          <button type="button" className="listing-feed-gallery-arrow is-left" aria-label="Previous image" disabled={activeImage === 0} onClick={showPrevious}>
            <ChevronLeft aria-hidden="true" />
          </button>
          <button type="button" className="listing-feed-gallery-arrow is-right" aria-label="Next image" disabled={activeImage === images.length - 1} onClick={showNext}>
            <ChevronRight aria-hidden="true" />
          </button>
          <span className="listing-feed-image-count">{activeImage + 1}/{images.length}</span>
        </>}
      </div>

      {images.length > 1 && (
        <div className="listing-feed-carousel-dots" aria-label="Choose listing image">
          {images.map((image, index) => (
            <button
              type="button"
              key={`${image}-dot-${index}`}
              className={index === activeImage ? "is-active" : ""}
              aria-label={`Show image ${index + 1} of ${images.length}`}
              aria-current={index === activeImage ? "true" : undefined}
              onClick={() => setActiveImage(index)}
            />
          ))}
        </div>
      )}

      <div className="listing-feed-content">
        <div className="listing-feed-actions">
          <SaveButton listing={listing} listingType={listingType} listingId={listing._id || listing.id} />
          {!isMine && (
            <button type="button" onClick={onChat}>
              <MessageCircle size={18} aria-hidden="true" />
              Chat with Seller
            </button>
          )}
          {isMine && <span className="listing-feed-own-note">This is your listing</span>}
        </div>

        <div className="listing-feed-heading listing-title-price-row">
          <h2>{listing.title || listing.name || "Untitled listing"}</h2>
          <strong className="listing-price">{price}</strong>
        </div>

        <FeedDescription description={listing?.description} sellerName={sellerName} />

        {isAccommodation && Number.isInteger(listing.bedrooms) && (
          <p className="listing-feed-extra">
            {listing.bedrooms} {listing.bedrooms === 1 ? "bedroom" : "bedrooms"}
            {listing.accommodationType ? ` · ${listing.accommodationType}` : ""}
          </p>
        )}
      </div>

      {fullscreen && (
        <div
          className="listing-feed-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`${listing.title || "Listing"} image`}
          onClick={() => {
            if (didSwipe.current) {
              didSwipe.current = false;
              return;
            }
            closeFullscreen();
          }}
          onTouchStart={(event) => {
            const touch = event.touches[0];
            touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
          }}
          onTouchEnd={handleTouchEnd}
        >
          <button type="button" className="listing-feed-lightbox-close" aria-label="Close image" onClick={closeFullscreen}><X aria-hidden="true" /></button>
          {images.length > 1 && <button type="button" className="listing-feed-lightbox-arrow is-left" aria-label="Previous image" disabled={activeImage === 0} onClick={(event) => { event.stopPropagation(); showPrevious(); }}><ChevronLeft aria-hidden="true" /></button>}
          <img src={images[activeImage]} alt={listing.title || "Listing"} onClick={(event) => { event.stopPropagation(); didSwipe.current = false; }} />
          {images.length > 1 && <button type="button" className="listing-feed-lightbox-arrow is-right" aria-label="Next image" disabled={activeImage === images.length - 1} onClick={(event) => { event.stopPropagation(); showNext(); }}><ChevronRight aria-hidden="true" /></button>}
        </div>
      )}
    </article>
  );
}
