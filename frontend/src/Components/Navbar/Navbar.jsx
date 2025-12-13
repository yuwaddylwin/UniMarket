import "./Navbar.css";
import { useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";

export default function Navbar() {
  const navigate = useNavigate();
  const { authUser } = useAuthStore();

  const handleChatClick = () => {
    if (!authUser) {
      navigate("/login");
    } else {
      navigate("/chat");
    }
  };

  return (
    <div className="navbar-container">
      <Logo />
      <Search />

      <div className="top-chat-icon" onClick={handleChatClick}>
        <MessageCircle size={18} />
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
