import { useSavedStore } from "../store/useSavedStore";
import BrandLogo from "../common/BrandLogo";
import { useLocation, useNavigate } from "react-router-dom";
import { primaryNavigationItems, getNavigationTarget, isNavigationItemActive } from "../../config/navigation";
import { useAuthStore } from "../store/useAuthStore";
import ProfileAvatar from "../common/ProfileAvatar";
import NavbarMenu from "../Navbar/NavbarMenu";
import "./DesktopChatNav.css";

const VISIBLE_RAIL_ITEMS = new Set(["home", "chat", "post", "search", "saved"]);

export default function DesktopChatNav() {
  const savedCount = useSavedStore(state => state.entries.length);
  const navigate = useNavigate();
  const location = useLocation();
  const { authUser, totalUnread } = useAuthStore();

  const railItems = primaryNavigationItems.filter((item) => VISIBLE_RAIL_ITEMS.has(item.id));

  return (
    <aside className="desktop-chat-nav">
      <div className="desktop-chat-brand"><BrandLogo /></div>

      <nav className="desktop-chat-nav-links" aria-label="Main navigation">
        {railItems.map((item) => {
          const Icon = item.icon;
          const active = isNavigationItemActive(item, location.pathname);
          const badge = item.id === "chat" ? (location.pathname.startsWith("/chat") ? 0 : totalUnread) : item.id === "saved" ? savedCount : 0;
          return (
            <button
              key={item.id}
              className={`desktop-chat-nav-item${active ? " is-active" : ""}`}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => navigate(getNavigationTarget(item, authUser))}
            >
              <span className="desktop-chat-nav-icon">
                <Icon aria-hidden="true" />
                {badge > 0 && <span className="desktop-chat-nav-badge">{badge > 99 ? "99+" : badge}</span>}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="desktop-chat-menu-wrap">
        <NavbarMenu menuId="desktop-chat-navbar-menu" />
      </div>

      {authUser && (
        <button
          className="desktop-chat-profile-button"
          type="button"
          aria-label="Open profile"
          onClick={() => navigate("/profile")}
        >
          <ProfileAvatar profilePic={authUser.profilePic} alt="" />
        </button>
      )}
    </aside>
  );
}
