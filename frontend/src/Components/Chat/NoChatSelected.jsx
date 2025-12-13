import { MessageCircle } from "lucide-react";
import "./NoChatSelected.css";

export default function NoChatSelected() {
  return (
    <div className="no-chat-container">
      <div className="no-chat-content">
        <MessageCircle size={48} className="chat-icon" />
        <h2>Welcome to UniMarket!</h2>
        <p>Start a conversation.</p>
      </div>
    </div>
  );
}
