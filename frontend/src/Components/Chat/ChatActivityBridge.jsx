import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { axiosInstance } from '../lib/axios';
import { syncPush } from './push';
export default function ChatActivityBridge() {
  const { authUser, socket, checkAuth } = useAuthStore();
  const { pathname } = useLocation();
  const onChatPage = pathname === '/chat' || pathname.startsWith('/chat/');
  useEffect(() => {
    if (authUser?._id) syncPush(authUser._id, authUser.preferences?.browserPush).catch(() => {});
    else if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistration('/').then(reg => reg?.active?.postMessage({ type: 'USER', userId: null })).catch(() => {});
  }, [authUser?._id, authUser?.preferences?.browserPush]);
  useEffect(() => {
    if (!socket) return;
    let disposed = false, reading = false, retry = false;
    const markRead = async () => {
      if (!socket.chatPageActive || disposed) return;
      if (reading) { retry = true; return; }
      reading = true;
      try { const { data } = await axiosInstance.post('/messages/seen-all'); if (data.hasMore) retry = true; await useAuthStore.getState().getUnreadCount(); }
      catch { /* Reconcile on the next heartbeat/reconnect without disrupting chat. */ }
      finally { reading = false; if (retry && !disposed) { retry = false; void markRead(); } }
    };
    const update = () => {
      socket.chatPageActive = onChatPage && document.visibilityState === 'visible' && document.hasFocus();
      socket.emit('chat:activity', socket.chatPageActive);
      if (socket.chatPageActive) void markRead();
      else void useAuthStore.getState().getUnreadCount();
    };
    update(); const timer = setInterval(update, 20000);
    socket.on('connect', update); socket.on('newMessage', markRead); socket.on('accountModerated', checkAuth);
    document.addEventListener('visibilitychange', update); window.addEventListener('focus', update); window.addEventListener('blur', update);
    return () => {
      disposed = true; clearInterval(timer); socket.chatPageActive = false; socket.emit('chat:activity', false);
      socket.off('connect', update); socket.off('newMessage', markRead); socket.off('accountModerated', checkAuth);
      document.removeEventListener('visibilitychange', update); window.removeEventListener('focus', update); window.removeEventListener('blur', update);
    };
  }, [socket, onChatPage, checkAuth]);
  return null;
}
