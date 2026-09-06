import { MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ProfileAvatar from "../common/ProfileAvatar";
import { formatListingPrice } from "../common/listingPrice";
import "../common/ListingPrice.css";
import "./AccommodationSection.css";

function buildDetails(listing) {
  return [
    Number.isInteger(listing.bedrooms)
      ? `${listing.bedrooms} ${listing.bedrooms === 1 ? "bedroom" : "bedrooms"}`
      : "",
    listing.description,
  ].filter(Boolean).join(" · ");
}

export default function AccommodationListingCard({ listing, showTypeLabel = false, hideTypeLabel = false }) {
  const navigate = useNavigate();
  const openListing = () => navigate(`/accommodations/${listing._id}`);
  const details = buildDetails(listing);
  const badge = showTypeLabel
    ? `Accommodation${listing.accommodationType ? ` · ${listing.accommodationType}` : ""}`
    : listing.accommodationType;

  return (
    <article
      className="accommodation-card"
      onClick={openListing}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openListing();
        }
      }}
      role="link"
      tabIndex={0}
    >
      <div className="accommodation-image">
        <img
          src={listing.images[0] || "/Images/unimarket/accommodation.jpg"}
          alt={listing.title}
          loading="lazy"
          onError={(event) => { event.currentTarget.src = "/Images/unimarket/accommodation.jpg"; }}
        />
        {!hideTypeLabel && badge && <span>{badge}</span>}
      </div>
      <div className="accommodation-body">
        <div className="accommodation-title-price listing-title-price-row">
          <h3>{listing.title}</h3>
          <div className="accommodation-price listing-price">
            {formatListingPrice(listing.price, listing.pricePeriod || "month")}
          </div>
        </div>
        <p className="accommodation-location"><MapPin size={15} aria-hidden="true" />{listing.location}</p>
        {listing?.seller?.fullName && (
          <div className="accommodation-seller seller-row">
            <ProfileAvatar
              className="seller-pic"
              profilePic={listing.seller.profilePic}
              alt={listing.seller.fullName}
              loading="lazy"
            />
            <span className="seller-name">{listing.seller.fullName}</span>
          </div>
        )}
        {details && <p className="accommodation-details">{details}</p>}
      </div>
    </article>
  );
}
