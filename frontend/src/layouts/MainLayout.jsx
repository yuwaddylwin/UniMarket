import { AccountStatusBanner } from "../Components/common/AccountStatusBanner";
import { Outlet, useLocation } from "react-router-dom";
import BottomNav from "../Components/BottomNavBar/BottomNav";
import Navbar from "../Components/Navbar/Navbar";

const MainLayout = ({ showBottomNav = true }) => {
  const location = useLocation();
  const isHome = location.pathname === "/";
  const isChatRoute =
    location.pathname === "/chat" || location.pathname.startsWith("/chat/");
  const isActiveMobileChat = location.pathname.startsWith("/chat/");
  const renderBottomNav = showBottomNav || isChatRoute;

  return (
    <div
      className={`app-shell${isChatRoute ? " app-shell--chat" : ""}${isActiveMobileChat ? " app-shell--active-chat" : ""}`}
    >
      <Navbar />
      <div
        className={`app-content${isHome ? " app-content--home" : ""}${
          renderBottomNav
            ? " app-content--with-bottom"
            : " app-content--without-bottom"
        }`}
      >
        <AccountStatusBanner />
        <Outlet />
      </div>
      {renderBottomNav && <BottomNav />}
    </div>
  );
};

export default MainLayout;
