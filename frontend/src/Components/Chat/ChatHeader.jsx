import { X } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import "./ChatHeader.css"

const ChatHeader = () => {
  const {
    selectedUser,
    setSelectedUser,
    onlineUsers, 
  } = useChatStore();

  if (!selectedUser) return null;

  const isOnline = onlineUsers.includes(selectedUser._id);

  return (
    <div className="chat-header">
      <div className="chat-header-left">
        <img
          src={selectedUser.profilePic || "/Image.user.png"}
          alt={selectedUser.fullName}
          className="chat-header-avatar"
        />

        <div className="chat-header-info">
          <h4>{selectedUser.fullName}</h4>
          <span className={isOnline ? "online" : "offline"}>
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
