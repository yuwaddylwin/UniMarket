import { AccountStatusBanner } from '../common/AccountStatusBanner';
import { Outlet, useLocation } from "react-router-dom";
import BottomNav from "../BottomNavBar/BottomNav";
import Navbar from "../Navbar/Navbar";

const MainLayout = ({ cartItems, showBottomNav = true }) => {
  const location = useLocation();
  const isHome = location.pathname === "/";
  const isChatRoute = location.pathname === "/chat" || location.pathname.startsWith("/chat/");
  const isActiveMobileChat = location.pathname.startsWith("/chat/");
  const renderBottomNav = showBottomNav || isChatRoute;

  return (
    <div className={`app-shell${isChatRoute ? " app-shell--chat" : ""}${isActiveMobileChat ? " app-shell--active-chat" : ""}`}>
      <Navbar cartCount={cartItems.length} />
      <div
        className={`app-content${isHome ? " app-content--home" : ""}${
          renderBottomNav ? " app-content--with-bottom" : " app-content--without-bottom"
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
