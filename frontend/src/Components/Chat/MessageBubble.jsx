import "./MessageBubble.css";

const MessageBubble = ({ message, isOwn, authUser, selectedUser }) => {
  return (
    <div className={`message-row ${isOwn ? "own" : "other"}`}>
      {!isOwn && (
        <img
          className="message-avatar"
          src={selectedUser.profilePic || "/Image/user.png"}
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
        <img
          className="message-avatar"
          src={authUser.profilePic || "/Image/user.png"}
          alt=""
        />
      )}
    </div>
  );
};

export default MessageBubble;
