import "./Navbar.css";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Search as SearchIcon } from "lucide-react";

export default function Navbar() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [isHidden, setIsHidden] = useState(false);
  const lastScrollY = useRef(0);
  const animationFrame = useRef(null);

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 767px)");
    const scrollThreshold = 7;
    const getScrollPosition = () =>
      Math.max(
        window.scrollY ||
          window.pageYOffset ||
          document.documentElement.scrollTop ||
          document.body.scrollTop ||
          0,
        0
      );

    const updateNavbar = () => {
      animationFrame.current = null;

      if (!mobileQuery.matches) {
        setIsHidden(false);
        lastScrollY.current = getScrollPosition();
        return;
      }

      const currentScrollY = getScrollPosition();

      if (currentScrollY <= scrollThreshold) {
        setIsHidden(false);
        lastScrollY.current = currentScrollY;
        return;
      }

      const scrollDifference = currentScrollY - lastScrollY.current;
      if (Math.abs(scrollDifference) < scrollThreshold) return;

      setIsHidden(scrollDifference > 0);
      lastScrollY.current = currentScrollY;
    };

    const handleScroll = () => {
      if (animationFrame.current !== null) return;
      animationFrame.current = window.requestAnimationFrame(updateNavbar);
    };

    const handleViewportChange = () => {
      lastScrollY.current = getScrollPosition();
      if (!mobileQuery.matches) setIsHidden(false);
    };

    lastScrollY.current = getScrollPosition();
    window.addEventListener("scroll", handleScroll, { passive: true });
    mobileQuery.addEventListener?.("change", handleViewportChange);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      mobileQuery.removeEventListener?.("change", handleViewportChange);
      if (animationFrame.current !== null) {
        window.cancelAnimationFrame(animationFrame.current);
      }
    };
  }, []);


  const handleSearch = (e) => {
    e.preventDefault();
    const query = q.trim();
    if (!query) return; 
    navigate(`/products?search=${encodeURIComponent(query)}`);
  };

  return (
    <header className={`navbar-container ${isHidden ? "navbar-hidden" : ""}`}>
      <nav className="navbar-inner" aria-label="Main navigation">
        <Logo />

        <div className="navbar-search-center">
          <Search
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onSubmit={handleSearch}
          />
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
    <form className="search-form" onSubmit={onSubmit}>
      <SearchIcon className="search-icon" size={18} aria-hidden="true" />
      <input
        type="text"
        placeholder="Search by title or seller..."
        value={value}
        onChange={onChange}
      />
      <button type="submit" className="search-button" aria-label="Search UniMarket">
        Search
      </button>
    </form>
  );
}
