import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState } from "react";
import Home from "./Components/Home/Home";
import Sell from "./Components/SellPage/sell";
import CartPage from "./Components/Navbar/Cart_Components/CartPage";
import "./App.css";

export default function App() {
  const [cartItems, setCartItems] = useState([]);
  
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home cartItems={cartItems} setCartItems={setCartItems} />} />
        <Route path="/sell" element={<Sell />} />
        <Route path="/cart" element={<CartPage cartItems={cartItems} />} />
      </Routes>
    </Router>
  );
}
