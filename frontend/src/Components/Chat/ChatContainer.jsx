import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef } from "react";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageBubble from "./MessageBubble";
import "./ChatContainer.css";
import { useAuthStore } from "../store/useAuthStore";

const ChatContainer = () => {
  const { messages, getMessages, isMessagesLoading, selectedUser, getSafety, markMessagesAsSeen, messagingBlocked, safetyLoading, safetyError, subscribeToMessages, unsubscribeFromMessages } =useChatStore();
  const { authUser, socket } = useAuthStore();
  const messageEndRef = useRef(null);

  useEffect(() => {
    if (selectedUser?._id) {
      getMessages(selectedUser._id);
      getSafety(selectedUser._id);

      subscribeToMessages();

      return () => unsubscribeFromMessages();
    }
  }, [authUser?._id, selectedUser?._id, getMessages, getSafety, socket, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    if(messageEndRef.current && messages){
      messageEndRef.current.scrollIntoView({behavior: "smooth"});}
  }, [messages]);

  useEffect(() => {
    if (!selectedUser || isMessagesLoading) return;
    let pending = false;
    const markVisible = async () => {
      if (pending || document.visibilityState !== 'visible' || !document.hasFocus()) return;
      const ids = [...document.querySelectorAll('[data-unread-message]')].filter(el => {
        const r = el.getBoundingClientRect();
        const container = el.closest('.chat-messages').getBoundingClientRect();
        return r.bottom > container.top && r.top < container.bottom;
      }).map(el => el.dataset.unreadMessage).slice(0, 500);
      if (!ids.length) return;
      pending = true;
      await markMessagesAsSeen(selectedUser._id, ids);
      pending = false;
    };
    const container = document.querySelector('.chat-messages');
    container?.addEventListener('scroll', markVisible);
    document.addEventListener('visibilitychange', markVisible);
    window.addEventListener('focus', markVisible);
    const timer = setTimeout(markVisible, 400);
    return () => { clearTimeout(timer); container?.removeEventListener('scroll', markVisible); document.removeEventListener('visibilitychange', markVisible); window.removeEventListener('focus', markVisible); };
  }, [messages, selectedUser, isMessagesLoading, markMessagesAsSeen]);

  if (isMessagesLoading) return <div className="loading">Loading...</div>;

  return (
    <div className="chat-container">
      <ChatHeader />

      <div className="chat-messages" aria-live="polite">
        {messages.length === 0 && (
          <div className="conversation-empty">Send a message to start the conversation.</div>
        )}
        {messages.map((message) => (
          <MessageBubble
            key={message._id}
            message={message}
            isOwn={message.senderId === authUser._id}
            authUser={authUser}
            selectedUser={selectedUser}
          />
        ))}
      <div ref={messageEndRef} style={{ height: 0 }} />
      </div>

      {safetyLoading && <div className="chat-blocked-notice" role="status">Checking messaging availability…</div>}
      {safetyError && !messagingBlocked && <div className="chat-blocked-notice" role="status">
        {safetyError} <button type="button" disabled={safetyLoading} onClick={() => getSafety(selectedUser._id)}>{safetyLoading ? 'Checking…' : 'Retry check'}</button>
      </div>}
      {messagingBlocked ? <div className="chat-blocked-notice" role="status">Messaging is unavailable because one of you has blocked the other.</div> : <MessageInput key={selectedUser?._id} />}
    </div>
  );
};

export default ChatContainer;
