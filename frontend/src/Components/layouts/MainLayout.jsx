import { Outlet } from "react-router-dom";
import BottomNav from "../BottomNavBar/BottomNav";

const MainLayout = ({ cartItems }) => {
  return (
    <>
      <Outlet />
      <BottomNav cartCount={cartItems.length} />
    </>
  );
};

export default MainLayout;
