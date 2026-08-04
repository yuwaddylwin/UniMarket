import { Outlet } from "react-router-dom";
import BottomNav from "../BottomNavBar/BottomNav";
import Navbar from "../Navbar/Navbar";

const MainLayout = ({ cartItems }) => {
  return (
    <>
      <Navbar />
      <div className="app-content">
        <Outlet />
      </div>
      <BottomNav cartCount={cartItems.length} />
    </>
  );
};

export default MainLayout;
