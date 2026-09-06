import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useItemsList } from "../Logics/useItemsList";
import { useAccommodations } from "../Logics/useAccommodations";
import ItemListingCard from "../ItemsList/ItemListingCard";
import AccommodationListingCard from "../Accommodation/AccommodationListingCard";
import LoadingSpinner from "../common/LoadingSpinner";
import "../common/ListingPage.css";
import "./SearchPage.css";

function matchesQuery(listing, query) {
  if (!query) return true;
  return [
    listing.title,
    listing.name,
    listing.description,
    listing.category,
    listing.location,
    listing.accommodationType,
    listing.seller?.fullName,
  ].some((value) => String(value || "").toLowerCase().includes(query));
}

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const incomingSearch = searchParams.get("search") || "";
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState(incomingSearch);
  const { items, isLoading: itemsLoading, error: itemsError } = useItemsList();
  const {
    accommodations,
    isLoading: accommodationsLoading,
    error: accommodationsError,
  } = useAccommodations();
  const query = activeSearch.trim().toLowerCase();

  useEffect(() => {
    setSearch("");
    setActiveSearch(incomingSearch);
  }, [incomingSearch]);

  const results = useMemo(() => [
    ...items.map((listing) => ({ ...listing, searchResultType: "item" })),
    ...accommodations.map((listing) => ({
      ...listing,
      searchResultType: "accommodation",
    })),
  ]
    .filter((listing) => matchesQuery(listing, query))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
  [items, accommodations, query]);

  const isLoading = itemsLoading || accommodationsLoading;
  const hasPartialError = Boolean(itemsError || accommodationsError);

  return (
    <main className="search-page">
      <h1 className="search-page-title">Search UniMarket</h1>
      <div className="search-page-bar listing-search">
        <Search size={21} aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setActiveSearch(event.target.value);
          }}
          placeholder="What are you looking for?"
          aria-label="Search items and accommodation"
          autoComplete="off"
        />
      </div>

      <section className="search-results" aria-live="polite">
        <header className="search-results-header">
          <div>
            <span>{query ? "Search results" : "Explore UniMarket"}</span>
            <h2>Items &amp; Accommodation</h2>
          </div>
          {!isLoading && <span>{results.length} {results.length === 1 ? "listing" : "listings"}</span>}
        </header>

        {hasPartialError && (
          <div className="search-results-warning" role="status">
            Some listings could not be loaded. Available results are shown below.
          </div>
        )}

        {isLoading ? (
          <LoadingSpinner className="search-results-loading" label="Loading listings…" />
        ) : results.length === 0 ? (
          <div className="search-results-empty">
            <strong>{query ? "No matching listings found." : "No listings available yet."}</strong>
            <span>{query ? "Try another name, category, or location." : "New posts will appear here."}</span>
          </div>
        ) : (
          <div className="search-results-grid">
            {results.map((listing) => listing.searchResultType === "item" ? (
              <ItemListingCard item={listing} key={`item-${listing._id}`} />
            ) : (
              <AccommodationListingCard listing={listing} hideTypeLabel key={`accommodation-${listing._id}`} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
