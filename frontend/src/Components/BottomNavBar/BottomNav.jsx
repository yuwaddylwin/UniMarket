import { Home, MessageCircle, Plus, Search, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import ProfileAvatar from "../common/ProfileAvatar";
import "./BottomNav.css";

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { authUser, totalUnread } = useAuthStore();

  const handleChatClick = () => navigate(authUser ? "/chat" : "/login");
  const handleProfileClick = () => navigate(authUser ? "/profile" : "/login");
  const isPostActive = location.pathname === "/post" || location.pathname === "/sell";
  const isActive = (path) =>
    path === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(path);

  return (
    <nav className="bottom-nav" aria-label="Quick navigation">
      <NavButton
        label="Home"
        icon={<Home aria-hidden="true" />}
        active={isActive("/")}
        onClick={() => navigate("/")}
      />

      <NavButton
        label="Chat"
        icon={<MessageCircle aria-hidden="true" />}
        active={isActive("/chat")}
        onClick={handleChatClick}
        badge={totalUnread > 0 ? (totalUnread > 99 ? "99+" : totalUnread) : null}
      />

      <button
        className={`bottom-nav-sell${isPostActive ? " is-active" : ""}`}
        type="button"
        aria-label="Post a listing"
        aria-current={isPostActive ? "page" : undefined}
        onClick={() => navigate(authUser ? "/post" : "/login")}
      >
        <span className="bottom-nav-sell-icon"><Plus aria-hidden="true" /></span>
        <span>Post</span>
      </button>

      <NavButton
        label="Search"
        icon={<Search aria-hidden="true" />}
        active={isActive("/search")}
        onClick={() => navigate("/search")}
      />

      <NavButton
        label="Profile"
        icon={authUser?.profilePic
          ? <ProfileAvatar className="bottom-nav-profile-photo" profilePic={authUser.profilePic} alt="" />
          : <User aria-hidden="true" />}
        active={isActive("/profile")}
        onClick={handleProfileClick}
      />
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
