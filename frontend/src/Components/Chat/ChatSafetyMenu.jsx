import { useEffect, useRef, useState } from 'react';
import { MoreVertical, Flag, ShieldBan, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import SafetyDialog from '../common/SafetyDialog';
import { axiosInstance } from '../lib/axios';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';

export default function ChatSafetyMenu({ user }) {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState(null);
  const ref = useRef(null);
  const trigger = useRef(null);
  const { blockedByMe, applySafety } = useChatStore();
  useEffect(() => {
    if (!open) return;
    ref.current.querySelector('[role=menuitem]')?.focus();
    const outside = e => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  const choose = name => { setOpen(false); trigger.current.focus(); setAction(name); };
  const confirm = async reason => {
    if (action === 'report') {
      await axiosInstance.post(`/messages/report/${user._id}`, { reason });
      toast.success('Report submitted. Thank you for helping keep UniMarket safe.');
    } else if (action === 'delete') {
      await axiosInstance.delete(`/messages/${user._id}`);
      if (useChatStore.getState().selectedUser?._id === user._id) useChatStore.setState(state => ({ messages: [], messagesVersion: state.messagesVersion + 1 }));
      await useChatStore.getState().getUsers();
      await useAuthStore.getState().getUnreadCount();
      toast.success('Messages deleted');
    } else {
      const { data } = await axiosInstance[action === 'unblock' ? 'delete' : 'post'](`/auth/blocked-users/${user._id}`);
      await applySafety(user._id, data);
      toast.success(action === 'unblock' ? 'User unblocked' : 'User blocked');
    }
  };
  const titles = { report: 'Why are you reporting this user?', block: 'Are you sure you want to block this user?', unblock: 'Unblock this user?', delete: 'Delete all messages?' };
  return <div className="chat-safety-menu" ref={ref} onKeyDown={e => {
    if (e.key === 'Escape') { setOpen(false); trigger.current.focus(); }
    if (open && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
      e.preventDefault(); const items = [...ref.current.querySelectorAll('[role=menuitem]')];
      const index = items.indexOf(document.activeElement);
      items[e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : (index + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
    }
    if (e.key === 'Tab') setOpen(false);
  }}>
    <button ref={trigger} className="chat-menu-trigger" aria-label="Conversation options" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}><MoreVertical size={22} /></button>
    {open && <div className="chat-menu-dropdown" role="menu" aria-label="Conversation options">
      <button role="menuitem" onClick={() => choose('report')}><Flag size={17} />Report User</button>
      <button role="menuitem" onClick={() => choose(blockedByMe ? 'unblock' : 'block')}><ShieldBan size={17} />{blockedByMe ? 'Unblock User' : 'Block User'}</button>
      <button role="menuitem" onClick={() => choose('delete')}><Trash2 size={17} />Delete All Chat</button>
    </div>}
    {action && <SafetyDialog title={titles[action]} description={action === 'block' ? 'You will no longer receive messages from this user, and they will not be able to send you new messages.' : action === 'delete' ? 'This will permanently delete all messages in this conversation. This action cannot be undone.' : action === 'unblock' ? 'You can message each other again unless this user has also blocked you.' : 'Tell us what happened so the UniMarket team can review your report.'} report={action === 'report'} confirmLabel={{ report: 'Submit report', block: 'Block', unblock: 'Unblock', delete: 'Delete' }[action]} onConfirm={confirm} onClose={() => setAction(null)} />}
  </div>;
}
