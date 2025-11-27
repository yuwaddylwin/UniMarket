import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState } from "react";
import Home from "./Components/Home/Home";
import Sell from "./Components/SellPage/sell";
import CartPage from "./Components/Navbar/Cart_Components/CartPage";
import ProductsDetails from "./Components/Products/ProductsDetails";
import "./App.css"; 

export default function App({AddtoCart}) {
  const [cartItems, setCartItems] = useState([]);
  
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home cartItems={cartItems} setCartItems={setCartItems} />} />
        <Route path="/sell" element={<Sell />} />
        <Route path="/cart" element={<CartPage cartItems={cartItems} />} />
        <Route path="/products/:id" element={<ProductsDetails AddtoCart={AddtoCart} cartItems={cartItems}/>} />
      </Routes>
    </Router>
  );
}



//Testing Code
// function App() {
//     return (
//       <div style={{ textAlign: "center", marginTop: "100px" }}>
//         <h1>Hello React App 🚀</h1>
//       </div>
//     );
//   }
  
//   export default App;
  