import { Link } from "react-router-dom";
import "../Navbar/Navbar.css";
export default function BrandLogo() {
  return (
    <Link className="logo" to="/" aria-label="UniMarket home">
      <img className="brand-monogram" src="/unimarket-icon.svg" alt="" />
      <span className="brand-wordmark">UniMarket</span>
    </Link>
  );
}

