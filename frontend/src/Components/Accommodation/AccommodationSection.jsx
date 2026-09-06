import LoadingSpinner from "../common/LoadingSpinner";
import { useAccommodations } from "../Logics/useAccommodations";
import { useNavigate } from "react-router-dom";
import AccommodationListingCard from "./AccommodationListingCard";
import "./AccommodationSection.css";

export default function AccommodationSection({ searchQuery = "", listingPage = false }) {
  const { accommodations, isLoading, error } = useAccommodations();
  const navigate = useNavigate();
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const visibleAccommodations = normalizedQuery
    ? accommodations.filter((listing) =>
        [
          listing.title,
          listing.location,
          listing.accommodationType,
          listing.description,
          listing.seller?.fullName,
        ].some((value) => String(value || "").toLowerCase().includes(normalizedQuery))
      )
    : accommodations;
  const hasState = isLoading || Boolean(error) || visibleAccommodations.length === 0;

  return (
    <section className={`accommodation-section${listingPage ? " accommodation-section--page" : ""}`} aria-labelledby={listingPage ? undefined : "accommodation-title"} aria-label={listingPage ? "Accommodation listings" : undefined}>
      {!listingPage && <div className="accommodation-header">
        <div>
          <span className="accommodation-eyebrow">Live close to campus</span>
          <h2 id="accommodation-title">Accommodation</h2>
        </div>
        {!listingPage && <button type="button" onClick={() => navigate("/accommodations")}>View All <span aria-hidden="true">&gt;</span></button>}
      </div>}

      <div className={`accommodation-row${listingPage ? " listing-page-grid" : ""}${hasState ? " accommodation-row--state" : ""}`}>
        {isLoading ? (
          <LoadingSpinner label="Loading accommodation…" />
        ) : error ? (
          <div className="accommodation-state accommodation-state--error" role="alert">
            <strong>We couldn't load accommodation.</strong>
            <span>{error}</span>
          </div>
        ) : visibleAccommodations.length === 0 ? (
          <div className="accommodation-state">
            <strong>{normalizedQuery ? "No matching accommodation found." : "No accommodation listed yet."}</strong>
            <span>{normalizedQuery ? "Try a different search." : "New student housing posts will appear here."}</span>
          </div>
        ) : (
          visibleAccommodations.map((listing) => (
            <AccommodationListingCard listing={listing} key={listing._id} />
          ))
        )}
      </div>
    </section>
  );
}
