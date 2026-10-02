import { useAuthStore } from "../../store/useAuthStore";
import "./AccountStatusBanner.css";
export function AccountStatusBanner() {
  const user = useAuthStore((state) => state.authUser);
  if (
    !user ||
    !["frozen", "suspended"].includes(user.accountStatus) ||
    (user.accountStatus === "frozen" &&
      new Date(user.restriction?.until) <= new Date())
  )
    return null;
  return (
    <div className="account-status-banner" role="status">
      {user.accountStatus === "frozen"
        ? `Account frozen until ${new Date(user.restriction.until).toLocaleString()}`
        : "Your account is suspended"}
      . Posting, editing and messaging are unavailable.{" "}
      {user.restriction?.reason}
    </div>
  );
}
