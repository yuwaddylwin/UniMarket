import { LogOut } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { primaryNavigationItems, getNavigationTarget, isNavigationItemActive } from "../../config/navigation";
import { useAuthStore } from "../store/useAuthStore";
import ProfileAvatar from "../common/ProfileAvatar";
import "./DesktopChatNav.css";

export default function DesktopChatNav({ cartCount = 0 }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { authUser, logout, totalUnread } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <aside className="desktop-chat-nav">
      <button className="desktop-chat-brand" type="button" onClick={() => navigate("/")} aria-label="UniMarket home">
        Uni<span>Market</span>
      </button>

      <nav className="desktop-chat-nav-links" aria-label="Main navigation">
        {primaryNavigationItems.map((item) => {
          const Icon = item.icon;
          const active = isNavigationItemActive(item, location.pathname);
          const badge = item.id === "chat" ? totalUnread : item.id === "cart" ? cartCount : 0;
          const profilePhoto = item.id === "profile" && authUser?.profilePic;
          return (
            <button
              key={item.id}
              className={`desktop-chat-nav-item${active ? " is-active" : ""}${item.id === "settings" ? " desktop-chat-nav-settings" : ""}`}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => navigate(getNavigationTarget(item, authUser))}
            >
              <span className="desktop-chat-nav-icon">
                {profilePhoto ? <ProfileAvatar profilePic={authUser.profilePic} alt="" /> : <Icon aria-hidden="true" />}
                {badge > 0 && <span className="desktop-chat-nav-badge">{badge > 99 ? "99+" : badge}</span>}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {authUser && (
        <button className="desktop-chat-user" type="button" onClick={handleLogout} aria-label="Log out">
          <ProfileAvatar profilePic={authUser.profilePic} alt="" />
          <span><strong>{authUser.fullName || authUser.username || "Account"}</strong><small>Log out</small></span>
          <LogOut aria-hidden="true" />
        </button>
      )}
    </aside>
  );
}
