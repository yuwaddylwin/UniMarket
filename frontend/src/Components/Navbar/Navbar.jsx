import "./Navbar.css";
import Profile from "../Profile/profile";
import Cart from "./Cart_Components/Cart";

export default function Navbar({ count }) {
  return (
    <div className="navbar-container">
      <Logo />
      <Search />
      <div className="icon-container">
        <Cart count={count} />
        <Profile />
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

function Search() {
  return (
    <form className="search-form">
      <input type="text" placeholder="🔍 Search by categories..." />
      <button type="button" className="search-button">
        Search
      </button>
    </form>
  );
}
