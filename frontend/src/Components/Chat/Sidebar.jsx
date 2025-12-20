import { useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./SidebarSkeleton/SidebarSkeleton";
import "./Sidebar.css";

const Sidebar = () => {
  const {
    getUsers,
    users,
    selectedUser,
    setSelectedUser,
    isUsersLoading,
  } = useChatStore();

  const { authUser, onlineUsers } = useAuthStore();

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <aside className="sidebar">
      <h3 className="sidebar-title">Search 🔍</h3>

      <div className="user-list">
        {users
          .filter((user) => user._id !== authUser?._id)
          .map((user) => {
            const isOnline = onlineUsers.includes(user._id);
            const isSelected = selectedUser?._id === user._id;

            return (
              <div
                key={user._id}
                onClick={() => setSelectedUser(user)}
                className={`user-item ${isSelected ? "active" : ""}`}
              >
                <div className="avatar-wrapper">
                  <img
                    src={user.profilePic || "/Images/user.png"}
                    alt={user.fullName}
                    className="sidebar-avatar"
                  />

                  {/* 🟢 ONLINE DOT */}
                  {isOnline && <span className="online-dot" />}
                </div>

                <div className="user-info">
                  <p className="username">{user.fullName}</p>
                  <span className={`status ${isOnline ? "online" : ""}`}>
                    {isOnline ? "Online" : "Offline"}
                  </span>
                </div>
              </div>
            );
          })}
      </div>
    </aside>
  );
};

export default Sidebar;
