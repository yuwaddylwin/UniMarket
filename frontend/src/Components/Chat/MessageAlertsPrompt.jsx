import { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { enablePush, pushSupported } from './push';
export default function MessageAlertsPrompt() {
  const { authUser, updatePreferences } = useAuthStore();
  const [dismissed, setDismissed] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  if (!pushSupported() || dismissed || authUser?.preferences?.browserPush || Notification.permission === 'denied') return null;
  return <div className="chat-alert-prompt"><p>Get message alerts when you’re away from Chat.</p><button disabled={busy} onClick={async () => { setBusy(true); setError(''); try { await enablePush(authUser._id); await updatePreferences({ ...authUser.preferences, messages: true, browserPush: true }); } catch (err) { setError(err.response?.data?.message || err.message); } finally { setBusy(false); } }}>{busy ? 'Enabling…' : 'Enable message alerts'}</button><button onClick={() => setDismissed(true)}>Not now</button>{error && <p role="alert">{error}</p>}</div>;
}
