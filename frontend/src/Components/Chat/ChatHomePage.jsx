import { useChatStore } from "../store/useChatStore";
import Sidebar from "./Sidebar";
import NoChatSelected from "./NoChatSelected";
import ChatContainer from "./ChatContainer";
import "./ChatHomePage.css";

const ChatHomePage = () => {
  const { selectedUser } = useChatStore();

  return (
    <div className="chat-layout">
      {/* LEFT SIDEBAR */}
      <div className="chat-sidebar">
        <Sidebar />
      </div>

      {/* RIGHT CONTENT */}
      <div className="chat-main">
        {!selectedUser ? <NoChatSelected /> : <ChatContainer />}
      </div>
    </div>
  );
};

export default ChatHomePage;
