import React from "react";
import "../Navbar.css";
import { useNavigate } from "react-router-dom";

function Cart({ count }) {
  const navigate = useNavigate();

  return (
    <div className="cart-icon">
      <img onClick={() => navigate("/cart")} 
      src="/Images/cart.png" 
      alt="Cart" />
      {count > 0 && <div className="cart-badge">{count}</div>}
    </div>
  );
}

export default Cart;
