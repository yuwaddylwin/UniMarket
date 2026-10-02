import { useRef } from "react";
import "../common/CarouselArrows.css";
import LoadingSpinner from "../common/LoadingSpinner";
import { useAccommodations } from "../../hooks/useAccommodations";
import ViewAllLink from "../common/ViewAllLink";
import AccommodationListingCard from "./AccommodationListingCard";
import "./AccommodationSection.css";

export default function AccommodationSection({
  searchQuery = "",
  listingPage = false,
}) {
  const { accommodations, isLoading, error } = useAccommodations();
  const scrollerRef = useRef(null);
  const scrollByCards = (direction) => {
    const row = scrollerRef.current;
    if (!row) return;
    const cardWidth =
      row.querySelector(".accommodation-card")?.getBoundingClientRect().width ||
      280;
    const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
    row.scrollBy({
      left: direction * (cardWidth + gap) * 2,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  };
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const visibleAccommodations = normalizedQuery
    ? accommodations.filter((listing) =>
        [
          listing.title,
          listing.location,
          listing.accommodationType,
          listing.description,
          listing.seller?.fullName,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(normalizedQuery)
        )
      )
    : accommodations;
  const hasState =
    isLoading || Boolean(error) || visibleAccommodations.length === 0;

  return (
    <section
      className={`accommodation-section${listingPage ? " accommodation-section--page" : ""}`}
      aria-labelledby={listingPage ? undefined : "accommodation-title"}
      aria-label={listingPage ? "Accommodation listings" : undefined}
    >
      {!listingPage && (
        <div className="accommodation-header">
          <div>
            <span className="accommodation-eyebrow">Live close to campus</span>
            <h2 id="accommodation-title">Accommodation</h2>
          </div>
          <ViewAllLink to="/accommodations" label="View all accommodation" />
        </div>
      )}

      <div className="accommodation-carousel">
        {!listingPage && !hasState && (
          <button
            className="il-arrow il-left"
            type="button"
            aria-label="Scroll accommodation left"
            onClick={() => scrollByCards(-1)}
          >
            ←
          </button>
        )}
        <div
          ref={scrollerRef}
          className={`accommodation-row${listingPage ? " listing-page-grid" : ""}${hasState ? " accommodation-row--state" : ""}`}
        >
          {isLoading ? (
            <LoadingSpinner label="Loading accommodation…" />
          ) : error ? (
            <div
              className="accommodation-state accommodation-state--error"
              role="alert"
            >
              <strong>We couldn't load accommodation.</strong>
              <span>{error}</span>
            </div>
          ) : visibleAccommodations.length === 0 ? (
            <div className="accommodation-state">
              <strong>
                {normalizedQuery
                  ? "No matching accommodation found."
                  : "No accommodation listed yet."}
              </strong>
              <span>
                {normalizedQuery
                  ? "Try a different search."
                  : "New student housing posts will appear here."}
              </span>
            </div>
          ) : (
            visibleAccommodations.map((listing) => (
              <AccommodationListingCard listing={listing} key={listing._id} />
            ))
          )}
        </div>
        {!listingPage && !hasState && (
          <button
            className="il-arrow il-right"
            type="button"
            aria-label="Scroll accommodation right"
            onClick={() => scrollByCards(1)}
          >
            →
          </button>
        )}
      </div>
    </section>
  );
}
