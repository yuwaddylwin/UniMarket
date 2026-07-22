import "./MessageBubble.css";
import ProfileAvatar from "../common/ProfileAvatar";

const MessageBubble = ({ message, isOwn, authUser, selectedUser }) => {
  return (
    <div className={`message-row ${isOwn ? "own" : "other"}`}>
      {!isOwn && (
        <ProfileAvatar
          className="message-avatar"
          profilePic={selectedUser.profilePic}
          alt=""
        />
      )}

      <div className="message-content">
        {/* TEXT BUBBLE */}
        {message.text && (
          <div className={`message-bubble ${isOwn ? "own-bubble" : ""}`}>
            <p className="message-text">{message.text}</p>
          </div>
        )}

        {/* IMAGE (SEPARATE) */}
        {message.image && (
          <img
            src={message.image}
            alt="sent"
            className="message-image"
            onClick={() => window.open(message.image, "_blank")}
          />
        )}

        {/* META (ONLY TIME) */}
        <div className="message-meta">
          <span className="time">
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>

      {isOwn && (
        <ProfileAvatar
          className="message-avatar"
          profilePic={authUser.profilePic}
          alt=""
        />
      )}
    </div>
  );
};

export default MessageBubble;
