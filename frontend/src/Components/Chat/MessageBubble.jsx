import "./MessageBubble.css";

const reactionsList = [
  { key: "heart", emoji: "❤️" },
  { key: "haha", emoji: "😂" },
  { key: "sad", emoji: "😢" },
  { key: "wow", emoji: "😮" },
  { key: "angry", emoji: "😡" },
  { key: "good", emoji: "👍" },
];

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
        <div className={`message-bubble ${isOwn ? "own-bubble" : ""}`}>
          {/* TEXT */}
          {message.text && (
            <p className="message-text">{message.text}</p>
          )}

          {/* IMAGE */}
          {message.image && (
            <img
              src={message.image}
              alt="sent"
              className="message-image"
              onClick={() => window.open(message.image, "_blank")}
            />
          )}
        </div>

        {/* reactions */}
        <div className="reaction-bar">
          {reactionsList.map((r) =>
            message.reactions?.[r.key] > 0 ? (
              <span key={r.key}>
                {r.emoji} {message.reactions[r.key]}
              </span>
            ) : null
          )}
        </div>

        {/* meta */}
        <div className="message-meta">
          <span className="time">
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>

          {isOwn && (
            <span className="seen">
              {message.seen ? "Seen" : "Delivered"}
            </span>
          )}
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
