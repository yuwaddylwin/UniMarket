import React, { useEffect, useMemo, useState } from "react";
import "./ItemsPage.css";
import "../common/ListingPrice.css";
import { useItemsList } from "../../hooks/useItemsList";
import ItemListingCard from "./ItemListingCard";
import ListingPageHeader from "../common/ListingPageHeader";
import { useSearchParams } from "react-router-dom";
import LoadingSpinner from "../common/LoadingSpinner";

export default function ItemsPage() {
  const { items, isLoading, error } = useItemsList();
  const [searchParams] = useSearchParams();

  const incomingSearch = searchParams.get("search") || "";
  const [rawSearch, setRawSearch] = useState(incomingSearch);
  useEffect(() => setRawSearch(incomingSearch), [incomingSearch]);
  const searchQuery = rawSearch.trim().toLowerCase();

  const { orderedItems, matchedCount } = useMemo(() => {
    if (!searchQuery) {
      return { orderedItems: items, matchedCount: null };
    }

    const matches = [];
    const others = [];

    for (const item of items) {
      const title = (item?.title || "").toLowerCase();
      const seller = (item?.seller?.fullName || "").toLowerCase();
      const isMatch =
        title.includes(searchQuery) || seller.includes(searchQuery);

      if (isMatch) matches.push(item);
      else others.push(item);
    }

    return {
      orderedItems: [...matches, ...others],
      matchedCount: matches.length,
    };
  }, [items, searchQuery]);

  return (
    <main className="listing-page ip-page">
      <ListingPageHeader
        title="All Items"
        searchLabel="Search items"
        placeholder="Search by name or seller"
        query={rawSearch}
        onQueryChange={setRawSearch}
      />
      {!isLoading && !error && searchQuery && matchedCount === 0 && (
        <div className="ip-result">
          <p className="ip-notfound">No matched item :(</p>
          <p className="ip-notfound-sub">
            Other items instead for: <b>{rawSearch}</b>
          </p>
        </div>
      )}

      <div className="ip-wrap">
        <div className="ip-row listing-page-grid">
          {isLoading ? (
            <LoadingSpinner className="ip-loading" label="Loading items…" />
          ) : error ? (
            <div className="ip-state ip-state--error" role="alert">
              <strong>We couldn't load the items.</strong>
              <span>{error}</span>
            </div>
          ) : orderedItems.length === 0 ? (
            <p className="ip-state">No items found.</p>
          ) : (
            orderedItems.map((item) => (
              <ItemListingCard item={item} imageOnly key={item._id} />
            ))
          )}
        </div>
      </div>
    </main>
  );
}
