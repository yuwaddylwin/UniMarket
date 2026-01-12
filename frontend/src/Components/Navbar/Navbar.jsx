import "./Navbar.css";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function Navbar() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");


  const handleSearch = (e) => {
    e.preventDefault();
    const query = q.trim();
    if (!query) return; 
    navigate(`/products?search=${encodeURIComponent(query)}`);
  };

  return (
  <div className="navbar-container">
    <Logo />

    <div className="navbar-search-center">
      <Search
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onSubmit={handleSearch}
      />
    </div>
  </div>
);
}

function Logo() {
  return (
    <div className="logo">
      Uni<span>Market</span>
    </div>
  );
}

function Search({ value, onChange, onSubmit }) {
  return (
    <form className="search-form" onSubmit={onSubmit}>
      <input
        type="text"
        placeholder="Search by title or seller..."
        value={value}
        onChange={onChange}
      />
      <button type="submit" className="search-button">
        Search
      </button>
    </form>
  );
}
