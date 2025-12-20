import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";

import Home from "./Components/Home/Home";
import Sell from "./Components/SellPage/sell";
import CartPage from "./Components/BottomNavBar/ShoppingCart/CartPage";
import ProductsDetails from "./Components/Products/ProductsDetails";
import ProfilePage from "./Components/Profile/forms/ProfilePage";
import LoginForm from "./Components/Profile/forms/LoginForm";
import SignUpForm from "./Components/Profile/forms/SignUpForm";
import ChatHomePage from "./Components/Chat/ChatHomePage";

import { useHomeLogic } from "./Components/Logics/useHome";
import { useAuthStore } from "./Components/store/useAuthStore";

import MainLayout from "./Components/layouts/MainLayout";
import { Toaster } from "react-hot-toast";
import "./App.css";

export default function App() {
  const [cartItems, setCartItems] = useState([]);
  const { checkAuth, isCheckingAuth, onlineUsers } = useAuthStore();
  const { AddtoCart } = useHomeLogic(cartItems, setCartItems);

  console.log({onlineUsers})

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isCheckingAuth) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <Toaster />

      <Routes>
        {/* ROUTES WITH BottomNav */}
        <Route element={<MainLayout cartItems={cartItems} />}>
          <Route path="/" element={<Home cartItems={cartItems} setCartItems={setCartItems} />} />
          <Route path="/login" element={<LoginForm/>} /> 
          <Route path="/signup" element={<SignUpForm/>} />
          <Route path="/sell" element={<Sell />} />
          <Route path="/cart" element={<CartPage cartItems={cartItems} setCartItems={setCartItems} />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/products/:id"
            element={
              <ProductsDetails
                AddtoCart={AddtoCart}
                cartItems={cartItems}
                setCartItems={setCartItems}
              />
            }
          />
        </Route>

        {/* ROUTES WITHOUT BottomNav */}
        <Route path="/chat" element={<ChatHomePage />} />
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
  