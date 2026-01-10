import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useChatStore } from "../store/useChatStore";
import Sidebar from "./Sidebar";
import NoChatSelected from "./NoChatSelected";
import ChatContainer from "./ChatContainer";
import "./ChatHomePage.css";
import { useIsMobile } from "./IsMobile";

const ChatHomePage = () => {
  const { sellerId } = useParams(); 
  const isMobile = useIsMobile();

  // get from store
  const {
    selectedUser,
    setSelectedUser,   
    getUsers,          
  } = useChatStore();

  useEffect(() => {
  if (!sellerId) return;

  let cancelled = false; 

  const pickUser = async () => {
    // already selected
    if (useChatStore.getState().selectedUser?._id === sellerId) return;

    // 1) try from current users list
    const existing = useChatStore.getState().users?.find((u) => u._id === sellerId);
    if (existing) {
      if (!cancelled) setSelectedUser(existing);
      return;
    }

    // 2) load users then select
    await getUsers();
    if (cancelled) return;

    const afterLoad = useChatStore.getState().users?.find((u) => u._id === sellerId);
    if (afterLoad) {
      if (!cancelled) setSelectedUser(afterLoad);
      return;
    }

    // 3) fallback
    if (!cancelled) setSelectedUser({ _id: sellerId });
  };

  pickUser();

  return () => {
    cancelled = true; // prevents late setSelectedUser after back navigation
  };
}, [sellerId, getUsers, setSelectedUser]);


  // MOBILE: show ONE page at a time
  if (isMobile) {
    return (
      <div className="mobile-layout">
        {selectedUser ? <ChatContainer /> : <Sidebar />}
      </div>
    );
  }

  // DESKTOP: show BOTH sidebar + chat
  return (
    <div className="chat-layout">
      <div className="chat-sidebar">
        <Sidebar />
      </div>

      <div className="chat-main">
        {!selectedUser ? <NoChatSelected /> : <ChatContainer />}
      </div>
    </div>
  );
};

export default ChatHomePage;
