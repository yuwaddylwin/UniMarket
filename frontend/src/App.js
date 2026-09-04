import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";

import Home from "./Components/Home/Home";
import Sell from "./Components/SellPage/sell";
import CartPage from "./Components/BottomNavBar/ShoppingCart/CartPage";
import ProductsDetails from "./Components/Products/ProductsDetails";
import ProfilePage from "./Components/Profile/forms/ProfilePage";
import ProfileSettingsPage from "./Components/Profile/forms/ProfileSettingsPage";
import LoginForm from "./Components/Profile/forms/LoginForm";
import SignUpForm from "./Components/Profile/forms/SignUpForm";
import ChatHomePage from "./Components/Chat/ChatHomePage";
import ItemsPage from "./Components/ItemsPage/ItemsPage";
import AccommodationsPage from "./Components/Accommodation/AccommodationsPage";
import AccommodationDetails from "./Components/Accommodation/AccommodationDetails";
import SearchPage from "./Components/Search/SearchPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import ResendVerificationPage from "./pages/ResendVerificationPage";
import { PrivacyPage, TermsPage } from "./pages/LegalPage";

import { useHomeLogic } from "./Components/Logics/useHome";
import { useAuthStore } from "./Components/store/useAuthStore";
import LoadingSpinner from "./Components/common/LoadingSpinner";
import RequireAuth from "./Components/common/RequireAuth";

import MainLayout from "./Components/layouts/MainLayout";
import { Toaster } from "react-hot-toast";
import "./App.css";

export default function App() {
  const [cartItems, setCartItems] = useState([]);
  const { checkAuth, isCheckingAuth, authUser } = useAuthStore();
  const { AddtoCart } = useHomeLogic(cartItems, setCartItems);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    document.documentElement.lang = authUser?.preferences?.language || "en";
  }, [authUser?.preferences?.language]);

  if (isCheckingAuth) {
    return (
      <LoadingSpinner
        className="loading-spinner--page"
        label="Loading UniMarket…"
      />
    );
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
          <Route
            path="/post"
            element={
              <RequireAuth>
                <Sell />
              </RequireAuth>
            }
          />
          <Route
            path="/sell"
            element={
              <RequireAuth>
                <Sell />
              </RequireAuth>
            }
          />
          <Route path="/cart" element={<CartPage cartItems={cartItems} setCartItems={setCartItems} />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route
            path="/profile/settings"
            element={
              <RequireAuth>
                <ProfileSettingsPage />
              </RequireAuth>
            }
          />
          <Route path="/products" element={<ItemsPage AddtoCart={AddtoCart} />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/accommodations" element={<AccommodationsPage />} />
          <Route path="/accommodations/:id" element={<AccommodationDetails />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
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
        <Route
          element={
            <MainLayout cartItems={cartItems} showBottomNav={false} />
          }
        >
            <Route path="/chat" element={<ChatHomePage cartCount={cartItems.length} />} />
            <Route path="/chat/:sellerId" element={<ChatHomePage cartCount={cartItems.length} />} />
            <Route path="/verify/:token" element={<VerifyEmailPage />} />
            <Route path="/resend-verification" element={<ResendVerificationPage />} />
        </Route>

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
