import { Outlet, useLocation } from "react-router-dom";
import BottomNav from "../BottomNavBar/BottomNav";
import Navbar from "../Navbar/Navbar";

const MainLayout = ({ cartItems, showBottomNav = true }) => {
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <>
      <Navbar cartCount={cartItems.length} />
      <div
        className={`app-content${isHome ? " app-content--home" : ""}${
          showBottomNav ? " app-content--with-bottom" : " app-content--without-bottom"
        }`}
      >
        <Outlet />
      </div>
      {showBottomNav && <BottomNav />}
    </>
  );
};

export default MainLayout;
