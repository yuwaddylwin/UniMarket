import AuthCodePage from "./pages/AuthCodePage";
import AdminDashboard from "./Components/Admin/AdminDashboard";
import ChatActivityBridge from "./Components/Chat/ChatActivityBridge";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";

import Home from "./Components/Home/Home";
import Sell from "./Components/SellPage/sell";
import SavedPage from "./Components/Saved/SavedPage";
import { useSavedStore } from "./store/useSavedStore";
import ProductsDetails from "./Components/Items/ProductsDetails";
import ProfilePage from "./Components/Profile/ProfilePage";
import ProfileSettingsPage from "./Components/Profile/ProfileSettingsPage";
import LoginForm from "./Components/Profile/LoginForm";
import SignUpForm from "./Components/Profile/SignUpForm";
import ChatHomePage from "./Components/Chat/ChatHomePage";
import ItemsPage from "./Components/Items/ItemsPage";
import AccommodationsPage from "./Components/Accommodation/AccommodationsPage";
import AccommodationDetails from "./Components/Accommodation/AccommodationDetails";
import SearchPage from "./Components/Search/SearchPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";

import HowItWorksPage from "./pages/HowItWorksPage";
import { PrivacyPage, TermsPage } from "./pages/LegalPage";

import { useAuthStore } from "./store/useAuthStore";
import StartupScreen from "./Components/common/StartupScreen";
import RequireAuth from "./Components/common/RequireAuth";

import MainLayout from "./layouts/MainLayout";
import { Toaster } from "react-hot-toast";
import "./App.css";
import "./theme.css";

export default function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const hasInitialized = useAuthStore((state) => state.hasInitialized);
  const isCheckingAuth = useAuthStore((state) => state.isCheckingAuth);
  const authUser = useAuthStore((state) => state.authUser);
  const authError = useAuthStore((state) => state.authError);
  useEffect(() => {
    useSavedStore.getState().setUser(authUser?._id || null);
  }, [authUser?._id]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    document.documentElement.lang = authUser?.preferences?.language || "en";
  }, [authUser?.preferences?.language]);

  return (
    <Router>
      <Toaster />
      {!hasInitialized && (
        <StartupScreen
          error={authError}
          onRetry={checkAuth}
          ready={hasInitialized}
        />
      )}
      {hasInitialized && (
        <div className="startup-ready">
          <ChatActivityBridge />
          {authError && (
            <div role="alert">
              {authError}{" "}
              <button disabled={isCheckingAuth} onClick={() => checkAuth()}>
                {isCheckingAuth ? "Checking session…" : "Retry session check"}
              </button>
        </div>
      )}

      <Routes>
        <Route path="/admin/*" element={<AdminDashboard />} />
        {/* Pages with bottom navigation */}
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
          <Route
            path="/saved"
            element={
              <RequireAuth>
                <SavedPage />
              </RequireAuth>
            }
          />
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
          <Route
            path="/accommodations/:id"
            element={<AccommodationDetails />}
          />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/products/:id" element={<ProductsDetails />} />
        </Route>

        {/* Pages without bottom navigation */}
        <Route element={<MainLayout showBottomNav={false} />}>
          <Route
            path="/chat"
            element={
              <RequireAuth>
                <ChatHomePage />
              </RequireAuth>
            }
          />
          <Route
            path="/chat/:sellerId"
            element={
              <RequireAuth>
                <ChatHomePage />
              </RequireAuth>
            }
          />
          <Route path="/login" element={<LoginForm />} />
          <Route path="/signup" element={<SignUpForm />} />
          <Route path="/verify-code" element={<AuthCodePage />} />
          <Route path="/forgot-password" element={<AuthCodePage reset />} />
          <Route path="/verify/:token" element={<VerifyEmailPage />} />
          <Route path="/resend-verification" element={<AuthCodePage />} />
        </Route>
      </Routes>
        </div>
      )}
    </Router>
  );
}
