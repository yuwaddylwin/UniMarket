import "./Navbar.css";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Search as SearchIcon, ShoppingCart } from "lucide-react";
import NavbarMenu from "./NavbarMenu";

export default function Navbar({ cartCount = 0 }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/";
  const [q, setQ] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSearch = (event) => {
    event.preventDefault();
    const query = q.trim();
    if (!query) return;
    setQ("");
    navigate(`/search?search=${encodeURIComponent(query)}`);
  };

  return (
    <header className={`navbar-container${isHome ? " navbar-container--home" : ""}${isMenuOpen ? " navbar-container--menu-open" : ""}`}>
      <nav className="navbar-inner" aria-label="Main navigation">
        <Logo />

        {isHome && (
          <div className="navbar-search-center">
            <Search value={q} onChange={(event) => setQ(event.target.value)} onSubmit={handleSearch} />
          </div>
        )}

        <div className="navbar-actions">
          {!isMenuOpen && (
            <Link
              className="navbar-icon-button navbar-cart-button"
              to="/cart"
              aria-label={`Cart with ${cartCount} item${cartCount === 1 ? "" : "s"}`}
            >
              <ShoppingCart aria-hidden="true" />
              {cartCount > 0 && <span className="navbar-cart-badge">{cartCount > 99 ? "99+" : cartCount}</span>}
            </Link>
          )}
          <NavbarMenu menuId="navbar-menu" onOpenChange={setIsMenuOpen} />
        </div>
      </nav>
    </header>
  );
}

function Logo() {
  return (
    <Link className="logo" to="/" aria-label="UniMarket home">
      Uni<span>Market</span>
    </Link>
  );
}

function Search({ value, onChange, onSubmit }) {
  return (
    <form className="search-form" role="search" onSubmit={onSubmit}>
      <SearchIcon className="search-icon" size={18} aria-hidden="true" />
      <input type="search" aria-label="Search UniMarket" placeholder="What are you looking for?" value={value} onChange={onChange} />
      <button type="submit" className="search-button" aria-label="Search UniMarket">Search</button>
    </form>
  );
}
