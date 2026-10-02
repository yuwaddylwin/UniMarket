import { Search } from "lucide-react";
import "./ListingPage.css";

export default function ListingPageHeader({
  title,
  searchLabel,
  placeholder,
  query,
  onQueryChange,
}) {
  return (
    <header className="listing-page-header">
      <h1>{title}</h1>
      <label className="listing-search">
        <Search size={18} aria-hidden="true" />
        <input
          type="search"
          aria-label={searchLabel}
          placeholder={placeholder}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </label>
    </header>
  );
}
