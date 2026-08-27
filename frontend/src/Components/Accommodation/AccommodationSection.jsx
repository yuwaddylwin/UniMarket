import { ArrowUpRight, MapPin } from "lucide-react";
import LoadingSpinner from "../common/LoadingSpinner";
import { useAccommodations } from "../Logics/useAccommodations";
import "./AccommodationSection.css";

function formatPrice(price, pricePeriod) {
  const numericPrice = Number(price);
  if (!Number.isFinite(numericPrice)) return "Price on request";
  const period = pricePeriod || "month";
  return `${new Intl.NumberFormat("en-US").format(numericPrice)} Baht / ${period}`;
}

function buildDetails(listing) {
  return [
    Number.isInteger(listing.bedrooms)
      ? `${listing.bedrooms} ${listing.bedrooms === 1 ? "bedroom" : "bedrooms"}`
      : "",
    listing.description,
  ].filter(Boolean).join(" · ");
}

export default function AccommodationSection() {
  const { accommodations, isLoading, error } = useAccommodations();
  const hasState = isLoading || Boolean(error) || accommodations.length === 0;

  return (
    <section className="accommodation-section" aria-labelledby="accommodation-title">
      <div className="accommodation-header">
        <div>
          <span className="accommodation-eyebrow">Live close to campus</span>
          <h2 id="accommodation-title">Accommodation</h2>
        </div>
        <button type="button">View All <span aria-hidden="true">&gt;</span></button>
      </div>

      <div className={`accommodation-row${hasState ? " accommodation-row--state" : ""}`}>
        {isLoading ? (
          <LoadingSpinner label="Loading accommodation…" />
        ) : error ? (
          <div className="accommodation-state accommodation-state--error" role="alert">
            <strong>We couldn't load accommodation.</strong>
            <span>{error}</span>
          </div>
        ) : accommodations.length === 0 ? (
          <div className="accommodation-state">
            <strong>No accommodation listed yet.</strong>
            <span>New student housing posts will appear here.</span>
          </div>
        ) : (
          accommodations.map((listing) => {
            const details = buildDetails(listing);
            return (
              <article className="accommodation-card" key={listing._id}>
                <div className="accommodation-image">
                  <img
                    src={listing.images[0] || "/Images/unimarket/accommodation.jpg"}
                    alt={listing.title}
                    loading="lazy"
                    onError={(event) => { event.currentTarget.src = "/Images/unimarket/accommodation.jpg"; }}
                  />
                  {listing.accommodationType && <span>{listing.accommodationType}</span>}
                </div>
                <div className="accommodation-body">
                  <div className="accommodation-price">{formatPrice(listing.price, listing.pricePeriod)}</div>
                  <h3>{listing.title}</h3>
                  <p className="accommodation-location"><MapPin size={15} aria-hidden="true" />{listing.location}</p>
                  {details && <p className="accommodation-details">{details}</p>}
                  <div className="accommodation-card-footer" aria-hidden="true">
                    <span>Explore listing</span>
                    <ArrowUpRight />
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
