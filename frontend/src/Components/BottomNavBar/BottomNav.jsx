import React from "react";
import { Home, Search, Plus, ShoppingCart } from "lucide-react";
import "./BottomNav.css";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";



export default function BottomNav({ cartCount = 0 }) {
  const navigate = useNavigate();
  const { authUser } = useAuthStore();
  


  return (
    <div className="bottom-nav">
      
      <Home onClick={() => navigate("/")} />
      <Search onClick={() => navigate("/search")} />
      <div className="plus-btn" onClick={() => navigate("/sell")}>
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
      <div className="avatar" onClick={() => navigate("/profile")}>
        <img 
          src={authUser?.profilePic || "/Images/user.png"} 
          alt="profile" 
        />
      </div>
    </div>
  );
}
