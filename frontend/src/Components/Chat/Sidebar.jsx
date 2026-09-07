import MessageAlertsPrompt from "./MessageAlertsPrompt";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./SidebarSkeleton/SidebarSkeleton";
import "./Sidebar.css";
import ProfileAvatar from "../common/ProfileAvatar";

const Sidebar = () => {
  const navigate = useNavigate();
  const {
    getUsers,
    users,
    selectedUser,
    setSelectedUser,
    isUsersLoading,
  } = useChatStore();

  const { authUser, onlineUsers, unreadCount, socket } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  useEffect(() => {
    if (!socket) return undefined;
    const refreshConversations = () => getUsers();
    socket.on("newMessage", refreshConversations);
    return () => socket.off("newMessage", refreshConversations);
  }, [socket, getUsers]);

  if (isUsersLoading) return <SidebarSkeleton />;

  const filteredUsers = users
    .filter((user) => user._id !== authUser?._id)
    .filter((user) =>
      String(user.fullName || user.username || "")
        .toLowerCase()
        .includes(searchTerm.trim().toLowerCase())
    );

  return (
    <aside className="sidebar">
      <div className="sidebar-heading">
        <span>Inbox</span>
        <h1>Messages</h1>
      </div>
      <MessageAlertsPrompt />
      <div className="sidebar-search">
        <Search size={18} aria-hidden="true" />
        <input
          type="text"
          placeholder="Search messages"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="user-list">
        {filteredUsers.length === 0 ? (
          <div className="no-users">
            <strong>{users.length ? "No conversations found" : "No conversations yet"}</strong>
            <span>{users.length ? "Try a different search." : "Start a chat from an item to see it here."}</span>
          </div>
        ) : (
          filteredUsers.map((user) => {
            const isOnline = onlineUsers.includes(user._id);
            const isSelected = selectedUser?._id === user._id;
            const userUnreadCount = unreadCount[user._id] || 0;

            return (
              <button
                type="button"
                key={user._id}
                onClick={() => {
                  setSelectedUser(user);
                  navigate(`/chat/${user._id}`);
                }}
                className={`user-item ${isSelected ? "active" : ""}`}
              >
                <div className="avatar-wrapper">
                  <ProfileAvatar
                    profilePic={user.profilePic}
                    alt={user.fullName}
                    className="sidebar-avatar"
                  />

                  {isOnline && <span className="online-dot" />}
                </div>

                <div className="user-info">
                  <p className="username">{user.fullName}</p>
                  <span className={`status ${isOnline ? "online" : ""}`}>
                    {isOnline ? "Online" : "Offline"}
                  </span>
                </div>

                {userUnreadCount > 0 && (
                  <div className="user-unread-badge">
                    {userUnreadCount > 99 ? "99+" : userUnreadCount}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
