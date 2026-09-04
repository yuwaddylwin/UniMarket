import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import ProfileAvatar from "../common/ProfileAvatar";
import { getNavigationTarget, isNavigationItemActive, primaryNavigationItems } from "../../config/navigation";
import "./BottomNav.css";

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { authUser, totalUnread } = useAuthStore();

  const mobileItems = primaryNavigationItems.filter((item) => item.mobile);

  return (
    <nav className="bottom-nav" aria-label="Quick navigation">
      {mobileItems.map((item) => {
        const Icon = item.icon;
        const active = isNavigationItemActive(item, location.pathname);
        const icon = item.id === "profile" && authUser?.profilePic
          ? <ProfileAvatar className="bottom-nav-profile-photo" profilePic={authUser.profilePic} alt="" />
          : <Icon aria-hidden="true" />;
        if (item.id === "post") {
          return (
            <button
              key={item.id}
              className={`bottom-nav-sell${active ? " is-active" : ""}`}
              type="button"
              aria-label="Post a listing"
              aria-current={active ? "page" : undefined}
              onClick={() => navigate(getNavigationTarget(item, authUser))}
            >
              <span className="bottom-nav-sell-icon">{icon}</span><span>{item.label}</span>
            </button>
          );
        }
        return (
          <NavButton
            key={item.id}
            label={item.label}
            icon={icon}
            active={active}
            onClick={() => navigate(getNavigationTarget(item, authUser))}
            badge={item.id === "chat" && totalUnread > 0 ? (totalUnread > 99 ? "99+" : totalUnread) : null}
          />
        );
      })}
    </nav>
  );
}

function NavButton({ label, icon, active, onClick, badge = null }) {
  return (
    <button
      className={`bottom-nav-item${active ? " is-active" : ""}`}
      type="button"
      aria-label={label}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
    >
      <span className="bottom-nav-icon">
        {icon}
        {badge !== null && <span className="bottom-nav-badge">{badge}</span>}
      </span>
      <span className="bottom-nav-label">{label}</span>
    </button>
  );
}
