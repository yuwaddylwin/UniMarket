import "./Navbar.css";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  LogOut,
  Menu,
  Search as SearchIcon,
  ShoppingCart,
  X,
} from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { CONTACT } from "../../config/contact";

const MAIN_MENU_ITEMS = [
  {
    number: "01",
    label: "Profile Settings",
    to: "/profile/settings",
  },
  { number: "02", label: "Accommodation", to: "/accommodations" },
  { number: "03", label: "Browse items", to: "/products" },
];

export default function Navbar({ cartCount = 0 }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { authUser, logout } = useAuthStore();
  const isHome = location.pathname === "/";
  const [q, setQ] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const menuRef = useRef(null);
  const helpMenuRef = useRef(null);
  const contactMenuRef = useRef(null);

  useEffect(() => {
    setIsMenuOpen(false);
    setHelpOpen(false);
    setContactOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMenuOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => {
      menuRef.current?.querySelector(".navbar-menu a, .navbar-menu button")?.focus();
    }, 220);

    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setIsMenuOpen(false);
        setHelpOpen(false);
        setContactOpen(false);
        return;
      }

      const clickedDropdown =
        helpMenuRef.current?.contains(event.target) ||
        contactMenuRef.current?.contains(event.target);
      if (!clickedDropdown) {
        setHelpOpen(false);
        setContactOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
        setHelpOpen(false);
        setContactOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
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

  const closeMenu = () => {
    setIsMenuOpen(false);
    setHelpOpen(false);
    setContactOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    closeMenu();
    navigate("/login");
  };

  return (
    <header className={`navbar-container${isHome ? " navbar-container--home" : ""}${isMenuOpen ? " navbar-container--menu-open" : ""}`}>
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
          {!isMenuOpen && (
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
          )}

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
            <div className="navbar-menu-shell">
              <div className="navbar-menu-content">
                <span className="navbar-menu-eyebrow">Explore UniMarket</span>
                <ul className="navbar-menu-list">
                  {MAIN_MENU_ITEMS.map((item) => {
                    return (
                    <li key={item.label}>
                      <Link className="navbar-menu-item" to={item.to} onClick={closeMenu}>
                        <span className="navbar-menu-number">{item.number}</span>
                        <span className="navbar-menu-label">
                          {item.label}
                        </span>
                      </Link>
                    </li>
                    );
                  })}

                  <li className="navbar-menu-group" ref={helpMenuRef}>
                    <button
                      className="navbar-menu-item navbar-menu-toggle"
                      type="button"
                      aria-expanded={helpOpen}
                      aria-controls="help-support-menu"
                      onClick={() => {
                        setHelpOpen((open) => !open);
                        setContactOpen(false);
                      }}
                    >
                      <span className="navbar-menu-number">04</span>
                      <span className="navbar-menu-label">Help &amp; Support</span>
                      <ChevronDown className={helpOpen ? "is-open" : ""} aria-hidden="true" />
                    </button>
                    <ul
                      id="help-support-menu"
                      className="navbar-submenu"
                      hidden={!helpOpen}
                    >
                      <li><a href="/#home-discovery" onClick={closeMenu}>How it works</a></li>
                      <li><Link to="/privacy" onClick={closeMenu}>Privacy</Link></li>
                      <li><Link to="/terms" onClick={closeMenu}>Terms</Link></li>
                    </ul>
                  </li>

                  <li className="navbar-menu-group" ref={contactMenuRef}>
                    <button
                      className="navbar-menu-item navbar-menu-toggle"
                      type="button"
                      aria-expanded={contactOpen}
                      aria-controls="contact-menu"
                      onClick={() => {
                        setContactOpen((open) => !open);
                        setHelpOpen(false);
                      }}
                    >
                      <span className="navbar-menu-number">05</span>
                      <span className="navbar-menu-label">Contact</span>
                      <ChevronDown className={contactOpen ? "is-open" : ""} aria-hidden="true" />
                    </button>
                    <ul id="contact-menu" className="navbar-submenu navbar-contact-submenu" hidden={!contactOpen}>
                      <li>
                        <a href={CONTACT.emailHref} onClick={closeMenu}>
                          <strong>Email</strong><small>{CONTACT.email}</small>
                        </a>
                      </li>
                      <li>
                        <a href={CONTACT.phoneHref} onClick={closeMenu}>
                          <strong>Phone</strong><small>{CONTACT.phone}</small>
                        </a>
                      </li>
                      <li>
                        <a href={CONTACT.addressHref} target="_blank" rel="noreferrer" onClick={closeMenu}>
                          <strong>Address</strong><small>{CONTACT.address}</small>
                        </a>
                      </li>
                    </ul>
                  </li>

                  {authUser && (
                    <li>
                      <button className="navbar-menu-item navbar-logout" type="button" onClick={handleLogout}>
                        <span className="navbar-menu-number">06</span>
                        <span className="navbar-menu-label"><LogOut aria-hidden="true" />Logout</span>
                      </button>
                    </li>
                  )}
                </ul>
              </div>
              <div className="navbar-menu-footer">
                <p>A marketplace made for student life.</p>
                <p>{CONTACT.address}</p>
              </div>
            </div>
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
