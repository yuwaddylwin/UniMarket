import BrandLogo from "../common/BrandLogo";
import "./NoChatSelected.css";

export default function NoChatSelected() {
  return (
    <div className="no-chat-container">
      <div className="no-chat-content">
        <BrandLogo />
        <h2>Welcome to your conversations</h2>
        <p>Start a conversation.</p>
      </div>
    </div>
  );
}
