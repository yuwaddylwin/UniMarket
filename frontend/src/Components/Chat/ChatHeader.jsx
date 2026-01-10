import { ArrowLeft } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { useIsMobile } from "./IsMobile";
import { useNavigate, useParams } from "react-router-dom";
import "./ChatHeader.css";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { sellerId } = useParams(); 

  if (!selectedUser) return null;

  const isOnline = onlineUsers.includes(selectedUser._id);

  const handleBack = () => {
    setSelectedUser(null);

    // if we entered via /chat/:sellerId, remove param so it won't re-select
    if (sellerId) {
      navigate("/chat");
    }
  };

  return (
    <div className="chat-header">
      <div className="chat-header-left">
        {isMobile && (
          <ArrowLeft
            className="chat-header-back"
            size={22}
            onClick={handleBack}
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
    </div>
  );
};

export default ChatHeader;
