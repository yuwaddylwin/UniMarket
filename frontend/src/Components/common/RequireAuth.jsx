import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";

export default function RequireAuth({ children }) {
  const authUser = useAuthStore((state) => state.authUser);
  const location = useLocation();

  if (!authUser) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return children;
}
