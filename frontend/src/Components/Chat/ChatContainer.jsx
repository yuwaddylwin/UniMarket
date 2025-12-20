import { useChatStore } from "../store/useChatStore";
import { useEffect } from "react";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageBubble from "./MessageBubble";
import "./ChatContainer.css";
import { useAuthStore } from "../store/useAuthStore";

const ChatContainer = () => {
  const { messages, getMessages, isMessagesLoading, selectedUser, subscribeToMessages, unsubscribeFromMessages } =useChatStore();
  const { authUser } = useAuthStore();

  useEffect(() => {
    if (selectedUser?._id) {
      getMessages(selectedUser._id);

      subscribeToMessages();

      return () => unsubscribeFromMessages();
    }
  }, [selectedUser?._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  if (isMessagesLoading) return <div className="loading">Loading...</div>;

  return (
    <div className="chat-container">
      <ChatHeader />

      <div className="chat-messages">
        {messages.map((message) => (
          <MessageBubble
            key={message._id}
            message={message}
            isOwn={message.senderId === authUser._id}
            authUser={authUser}
            selectedUser={selectedUser}
          />
        ))}
      </div>

      <MessageInput />
    </div>
  );
};

export default ChatContainer;
