import React from "react";
import "../Navbar.css";

function Cart({ count }) {
  return (
    <div className="cart-icon">
      <img src="/Images/cart.png" alt="Cart" />
      {count > 0 && <div className="cart-badge">{count}</div>}
    </div>
  );
}

export default Cart;
