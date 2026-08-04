import React from "react";
import { Home, Plus, ShoppingCart } from "lucide-react";
import "./BottomNav.css";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { MessageCircle } from "lucide-react";
import ProfileAvatar from "../common/ProfileAvatar";


export default function BottomNav({ cartCount = 0 }) {
  
  const navigate = useNavigate();
  const { authUser, totalUnread } = useAuthStore();
  
  const handleChatClick = () => {
    if (!authUser) navigate("/login");
    else navigate("/chat");
  };


  return (
    <nav className="bottom-nav" aria-label="Quick navigation">
      
      <button className="bottom-nav-item" type="button" aria-label="Home" onClick={() => navigate("/")}><Home /></button>
      <button className="bottom-nav-item chat-icon-wrapper" type="button" aria-label="Messages" onClick={handleChatClick}>
        <MessageCircle className="bn-chat-icon"/>
        {totalUnread > 0 && (
          <div className="message-badge">
            {totalUnread > 99 ? "99+" : totalUnread}
          </div>
        )}
      </button>
      <button
          className="plus-btn"
          type="button"
          aria-label="Sell an item"
          onClick={() => navigate(authUser ? "/sell" : "/login")}
        >
          <Plus />
        </button>



      <button className="bottom-nav-item cart-icon" type="button" aria-label={`Cart with ${cartCount} items`} onClick={() => navigate("/cart")}>
        <ShoppingCart />

        {cartCount > 0 && (
          <div className="cart-badge">
            {cartCount}
          </div>
        )}
      </button>

      {/* Profile Avatar */}
      <button
        type="button"
        className="bottom-nav-item avatar"
        aria-label="Profile"
        onClick={() => {
          if (!authUser) {
            navigate("/login");
          } else {
            navigate("/profile");
          }
        }}
      >
        <ProfileAvatar
          profilePic={authUser?.profilePic}
          alt="profile" 
        />
      </button>
    </nav>
  );
}
