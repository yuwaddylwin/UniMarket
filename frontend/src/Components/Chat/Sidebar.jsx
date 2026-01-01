import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./SidebarSkeleton/SidebarSkeleton";
import "./Sidebar.css";
import BottomNav from "../BottomNavBar/BottomNav";

const Sidebar = () => {
  const {
    getUsers,
    users,
    selectedUser,
    setSelectedUser,
    isUsersLoading,
  } = useChatStore();

  const { authUser, onlineUsers } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  if (isUsersLoading) return <SidebarSkeleton />;

  const filteredUsers = users
    .filter((user) => user._id !== authUser?._id)
    .filter((user) =>
      user.fullName.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <aside className="sidebar">
      {/*  SEARCH BAR */}
      <div className="sidebar-search">
        <input
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="user-list">
        {filteredUsers.length === 0 ? (
          <p className="no-users">No users found</p>
        ) : (
          filteredUsers.map((user) => {
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
          })
        )}
      </div>
      <BottomNav/>
    </aside>
  );
};

export default Sidebar;
