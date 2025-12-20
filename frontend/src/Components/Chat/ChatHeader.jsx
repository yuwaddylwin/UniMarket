import { X } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import "./ChatHeader.css";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers } = useAuthStore();

  if (!selectedUser) return null;

  const isOnline = onlineUsers.includes(selectedUser._id);

  return (
    <div className="chat-header">
      <div className="chat-header-left">
        <div className="chat-header-avatar-wrapper">
          <img
            src={selectedUser.profilePic || "/Images/user.png"}
            alt={selectedUser.fullName}
            className="chat-header-avatar"
          />

          {/* 🟢 ONLINE DOT */}
          {isOnline && <span className="chat-online-dot" />}
        </div>

        <div className="chat-header-info">
          <h4>{selectedUser.fullName}</h4>
          <span className={`status ${isOnline ? "online" : "offline"}`}>
            {isOnline ? "Online" : "Offline"}
          </span>
        </div>
      </div>

      <button
        className="chat-header-close"
        onClick={() => setSelectedUser(null)}
      >
        <X size={20} />
      </button>
    </div>
  );
};

export default ChatHeader;
