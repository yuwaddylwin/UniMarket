import { X, ArrowLeft } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { useIsMobile } from "./IsMobile";
import "./ChatHeader.css";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const isMobile = useIsMobile();

  if (!selectedUser) return null;

  const isOnline = onlineUsers.includes(selectedUser._id);

  return (
    <div className="chat-header">
      <div className="chat-header-left">
        {/* ← BACK ARROW (MOBILE ONLY) */}
        {isMobile && (
          <ArrowLeft
            className="chat-header-back"
            size={22}
            onClick={() => setSelectedUser(null)}
          />
        )}

        <div className="chat-header-avatar-wrapper">
          <img
            src={selectedUser.profilePic || "/Images/user.png"}
            alt={selectedUser.fullName}
            className="chat-header-avatar"
          />

          {isOnline && <span className="chat-online-dot" />}
        </div>

        <div className="chat-header-info">
          <h4>{selectedUser.fullName}</h4>
          <span className={`status ${isOnline ? "online" : "offline"}`}>
            {isOnline ? "Online" : "Offline"}
          </span>
        </div>
      </div>

      {/* ❌ CLOSE (DESKTOP ONLY) */}
      {!isMobile && (
        <button
          className="chat-header-close"
          onClick={() => setSelectedUser(null)}
        >
          <X size={20} />
        </button>
      )}
    </div>
  );
};

export default ChatHeader;
