import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";

export default function RequireAuth({ children }) {
  const authUser = useAuthStore((state) => state.authUser);
  const authError = useAuthStore((state) => state.authError);
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const location = useLocation();
  if (!authUser && authError)
    return (
      <div role="alert">
        {authError}{" "}
        <button onClick={() => checkAuth()}>Retry session check</button>
      </div>
    );

  if (!authUser) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
