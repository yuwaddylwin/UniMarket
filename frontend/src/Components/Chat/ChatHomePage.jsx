import { useChatStore } from "../store/useChatStore";
import Sidebar from "./Sidebar";
import NoChatSelected from "./NoChatSelected";
import ChatContainer from "./ChatContainer";
import "./ChatHomePage.css";
import { useIsMobile } from "./IsMobile";

const ChatHomePage = () => {
  const { selectedUser } = useChatStore();
  const isMobile = useIsMobile();

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
