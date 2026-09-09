import { removeAuthToken } from './Components/lib/axios';
import AuthCodePage from './pages/AuthCodePage';
import GoogleCompletePage from './pages/GoogleCompletePage';
import AdminDashboard from './Components/Admin/AdminDashboard';
import ChatActivityBridge from './Components/Chat/ChatActivityBridge';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";

import Home from "./Components/Home/Home";
import Sell from "./Components/SellPage/sell";
import SavedPage from "./Components/Saved/SavedPage";
import { useSavedStore } from "./Components/store/useSavedStore";
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

import HowItWorksPage from "./pages/HowItWorksPage";
import { PrivacyPage, TermsPage } from "./pages/LegalPage";

import { useAuthStore } from "./Components/store/useAuthStore";
import LoadingSpinner from "./Components/common/LoadingSpinner";
import RequireAuth from "./Components/common/RequireAuth";

import MainLayout from "./Components/layouts/MainLayout";
import { Toaster } from "react-hot-toast";
import "./App.css";
import "./theme.css";

export default function App() {
  const checkAuth = useAuthStore(state => state.checkAuth);
  const isCheckingAuth = useAuthStore(state => state.isCheckingAuth);
  const authUser = useAuthStore(state => state.authUser);
  const authError = useAuthStore(state => state.authError);
  useEffect(() => {
    useSavedStore.getState().setUser(authUser?._id || null);
  }, [authUser?._id]);

  useEffect(() => {
    if (window.location.pathname === '/auth/google/complete') removeAuthToken();
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
      <ChatActivityBridge />
      {authError && <div role="alert">{authError} <button onClick={() => checkAuth()}>Retry session check</button></div>}

      <Routes>
        <Route path="/admin/*" element={<AdminDashboard />} />
        {/* ROUTES WITH BottomNav */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
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
          <Route path="/saved" element={<RequireAuth><SavedPage /></RequireAuth>} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route
            path="/profile/settings"
            element={
              <RequireAuth>
                <ProfileSettingsPage />
              </RequireAuth>
            }
          />
          <Route path="/products" element={<ItemsPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/accommodations" element={<AccommodationsPage />} />
          <Route path="/accommodations/:id" element={<AccommodationDetails />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/products/:id" element={<ProductsDetails />} />
        </Route>

        {/* ROUTES WITHOUT BottomNav */}
        <Route
          element={
            <MainLayout showBottomNav={false} />
          }
        >
            <Route path="/chat" element={<RequireAuth><ChatHomePage /></RequireAuth>} />
            <Route path="/chat/:sellerId" element={<RequireAuth><ChatHomePage /></RequireAuth>} />
            <Route path="/login" element={<LoginForm/>} />
            <Route path="/signup" element={<SignUpForm/>} />
            <Route path="/verify-code" element={<AuthCodePage />} />
            <Route path="/forgot-password" element={<AuthCodePage reset />} />
            <Route path="/auth/google/complete" element={<GoogleCompletePage />} />
            <Route path="/verify/:token" element={<VerifyEmailPage />} />
            <Route path="/resend-verification" element={<AuthCodePage />} />
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
