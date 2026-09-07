import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Menu, X } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { CONTACT } from "../../config/contact";
import "./Navbar.css";

const MAIN_MENU_ITEMS = [
  { number: "01", label: "Profile Settings", to: "/profile/settings" },
  { number: "02", label: "Accommodation", to: "/accommodations" },
  { number: "03", label: "Browse items", to: "/products" },
];

export default function NavbarMenu({ menuId = "navbar-menu", onOpenChange }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { authUser, logout } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  const helpMenuRef = useRef(null);
  const contactMenuRef = useRef(null);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
    setHelpOpen(false);
    setContactOpen(false);
    onOpenChange?.(false);
  }, [onOpenChange]);

  useEffect(() => {
    closeMenu();
  }, [location.pathname, closeMenu]);

  useEffect(() => {
    if (!isMenuOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => {
      menuRef.current?.querySelector(".navbar-menu a, .navbar-menu button")?.focus();
    }, 220);

    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        closeMenu();
        return;
      }
      const clickedDropdown = helpMenuRef.current?.contains(event.target) || contactMenuRef.current?.contains(event.target);
      if (!clickedDropdown) {
        setHelpOpen(false);
        setContactOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeMenu();
        triggerRef.current?.focus();
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
  }, [closeMenu, isMenuOpen]);

  const toggleMenu = () => {
    const nextOpen = !isMenuOpen;
    setIsMenuOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  const handleLogout = async () => {
    await logout();
    closeMenu();
    navigate("/login");
  };

  const helpId = `${menuId}-help-support`;
  const contactId = `${menuId}-contact`;

  return (
    <div className="navbar-menu-control" ref={menuRef}>
      <button
        ref={triggerRef}
        className={`navbar-icon-button navbar-menu-trigger${isMenuOpen ? " is-open" : ""}`}
        type="button"
        aria-label={isMenuOpen ? "Close menu" : "Open menu"}
        aria-expanded={isMenuOpen}
        aria-controls={menuId}
        onClick={toggleMenu}
      >
        {isMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
      </button>

      <div
        id={menuId}
        className={`navbar-menu${isMenuOpen ? " navbar-menu--open" : ""}`}
        aria-hidden={!isMenuOpen}
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) closeMenu();
        }}
      >
        <div className="navbar-menu-shell">
          <div className="navbar-menu-content">
            <span className="navbar-menu-eyebrow">Explore UniMarket</span>
            <ul className="navbar-menu-list">
              {[...MAIN_MENU_ITEMS, ...(authUser?.role === "admin" ? [{ number: "", label: "Admin Dashboard", to: "/admin" }] : [])].map((item) => (
                <li key={item.label}>
                  <Link className="navbar-menu-item" to={item.to} onClick={closeMenu}>
                    <span className="navbar-menu-number">{item.number}</span>
                    <span className="navbar-menu-label">{item.label}</span>
                  </Link>
                </li>
              ))}

              <li className="navbar-menu-group" ref={helpMenuRef}>
                <button className="navbar-menu-item navbar-menu-toggle" type="button" aria-expanded={helpOpen} aria-controls={helpId} onClick={() => { setHelpOpen((open) => !open); setContactOpen(false); }}>
                  <span className="navbar-menu-number">04</span>
                  <span className="navbar-menu-label">Help &amp; Support</span>
                  <ChevronDown className={helpOpen ? "is-open" : ""} aria-hidden="true" />
                </button>
                <ul id={helpId} className="navbar-submenu" hidden={!helpOpen}>
                  <li><Link to="/how-it-works" onClick={closeMenu}>How it works</Link></li>
                  <li><Link to="/privacy" onClick={closeMenu}>Privacy</Link></li>
                  <li><Link to="/terms" onClick={closeMenu}>Terms</Link></li>
                </ul>
              </li>

              <li className="navbar-menu-group" ref={contactMenuRef}>
                <button className="navbar-menu-item navbar-menu-toggle" type="button" aria-expanded={contactOpen} aria-controls={contactId} onClick={() => { setContactOpen((open) => !open); setHelpOpen(false); }}>
                  <span className="navbar-menu-number">05</span>
                  <span className="navbar-menu-label">Contact</span>
                  <ChevronDown className={contactOpen ? "is-open" : ""} aria-hidden="true" />
                </button>
                <ul id={contactId} className="navbar-submenu navbar-contact-submenu" hidden={!contactOpen}>
                  <li><a href={CONTACT.emailHref} onClick={closeMenu}><strong>Email</strong><small>{CONTACT.email}</small></a></li>
                  <li><a href={CONTACT.phoneHref} onClick={closeMenu}><strong>Phone</strong><small>{CONTACT.phone}</small></a></li>
                  <li><a href={CONTACT.addressHref} target="_blank" rel="noreferrer" onClick={closeMenu}><strong>Address</strong><small>{CONTACT.address}</small></a></li>
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
  );
}
