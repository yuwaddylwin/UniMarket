import "./Navbar.css";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Menu, Search as SearchIcon, ShoppingCart, X } from "lucide-react";

const MENU_ITEMS = [
  "Profile Setting",
  "Accommodation",
  "Items",
  "Help",
  "Contact",
];

export default function Navbar({ cartCount = 0 }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/";
  const [q, setQ] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => setIsMenuOpen(false), [location.pathname]);

  useEffect(() => {
    if (!isMenuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) setIsMenuOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsMenuOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  const handleSearch = (event) => {
    event.preventDefault();
    const query = q.trim();
    if (!query) return;
    navigate(`/products?search=${encodeURIComponent(query)}`);
  };

  return (
    <header className={`navbar-container${isHome ? " navbar-container--home" : ""}`}>
      <nav className="navbar-inner" aria-label="Main navigation">
        <Logo />

        {isHome && (
          <div className="navbar-search-center">
            <Search
              value={q}
              onChange={(event) => setQ(event.target.value)}
              onSubmit={handleSearch}
            />
          </div>
        )}

        <div className="navbar-actions" ref={menuRef}>
          <Link
            className="navbar-icon-button navbar-cart-button"
            to="/cart"
            aria-label={`Cart with ${cartCount} item${cartCount === 1 ? "" : "s"}`}
          >
            <ShoppingCart aria-hidden="true" />
            {cartCount > 0 && (
              <span className="navbar-cart-badge">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>

          <button
            className="navbar-icon-button"
            type="button"
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMenuOpen}
            aria-controls="navbar-menu"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            {isMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>

          <div
            id="navbar-menu"
            className={`navbar-menu${isMenuOpen ? " navbar-menu--open" : ""}`}
            aria-hidden={!isMenuOpen}
          >
            <ul>
              {MENU_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
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
      <input
        type="search"
        aria-label="Search UniMarket"
        placeholder="What are you looking for?"
        value={value}
        onChange={onChange}
      />
      <button type="submit" className="search-button" aria-label="Search UniMarket">
        Search
      </button>
    </form>
  );
}
