import React from "react";
import { Home, Plus, ShoppingCart } from "lucide-react";
import "./BottomNav.css";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { MessageCircle } from "lucide-react";



export default function BottomNav({ cartCount = 0 }) {
  
  const navigate = useNavigate();
  const { authUser } = useAuthStore();
  
  const handleChatClick = () => {
    if (!authUser) navigate("/login");
    else navigate("/chat");
  };


  return (
    <div className="bottom-nav">
      
      <Home onClick={() => navigate("/")} />
      <div onClick={handleChatClick}>
        <MessageCircle className="bn-chat-icon"/>
      </div>
      <div
          className="plus-btn"
          onClick={() => navigate(authUser ? "/sell" : "/login")}
        >
          <Plus />
        </div>



      <div className="cart-icon" onClick={() => navigate("/cart")}>
        <ShoppingCart />

        {cartCount > 0 && (
          <div className="cart-badge">
            {cartCount}
          </div>
        )}
      </div>

      {/* Profile Avatar */}
      <div 
        className="avatar" 
        onClick={() => {
          if (!authUser) {
            navigate("/login");
          } else {
            navigate("/profile");
          }
        }}
      >
        <img 
          src={authUser?.profilePic || "/Images/user.png"} 
          alt="profile" 
        />
      </div>
    </div>
  );
}
