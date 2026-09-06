import { useState } from "react";
import ListingPageHeader from "../common/ListingPageHeader";
import AccommodationSection from "./AccommodationSection";

export default function AccommodationsPage() {
  const [query, setQuery] = useState("");

  return (
    <main className="listing-page accommodations-page">
      <ListingPageHeader title="All Accommodation" searchLabel="Search accommodation"
        placeholder="Search by name, location or type" query={query} onQueryChange={setQuery} />
      <AccommodationSection searchQuery={query} listingPage />
    </main>
  );
}
