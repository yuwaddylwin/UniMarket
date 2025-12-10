import "./Navbar.css";
// import { useNavigate } from "react-router-dom";
// import { MessageCircle } from "lucide-react";


export default function Navbar() {
  // const navigate = useNavigate();
  return (
    <div className="navbar-container">
      <Logo />
      <Search />
      {/* <div className="top-chat-icon" onClick={() => navigate("/chat")}>
        <MessageCircle size={18} />
      </div> */}
      </div>
  )
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
