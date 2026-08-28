import { useState } from "react";
import { Search } from "lucide-react";
import AccommodationSection from "./AccommodationSection";
import "./AccommodationsPage.css";

export default function AccommodationsPage() {
  const [query, setQuery] = useState("");

  return (
    <main className="accommodations-page">
      <header className="accommodations-page-header">
        <div>
          <span>Student housing</span>
          <h1>All Accommodation</h1>
        </div>
        <label className="accommodations-search">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Search accommodation</span>
          <input
            type="search"
            placeholder="Search by name, location or type"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </header>
      <AccommodationSection searchQuery={query} listingPage />
    </main>
  );
}
