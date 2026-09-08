import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthFrame, UsernameField, errorMessage } from '../Components/Profile/forms/AuthShared';
import { axiosInstance, removeAuthToken } from '../Components/lib/axios';
import { useAuthStore } from '../Components/store/useAuthStore';
export default function GoogleCompletePage() {
  const [pending, setPending] = useState(null), [username, setUsername] = useState(''), [code, setCode] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false), [cooldown, setCooldown] = useState(60);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const sessionError = 'Google sign-in finished, but UniMarket could not restore your session. Make sure cookies are allowed and that the frontend and backend use the same environment, then sign in again.';
  useEffect(() => {
    let live = true;
    const controller = new AbortController();
    async function restore() {
      // A legacy bearer token must not override the new Google session cookie.
      removeAuthToken();
      try {
        const { data } = await axiosInstance.get('/auth/google/pending', { timeout: 10000, signal: controller.signal });
        if (live) setPending(data);
      } catch (err) {
        if (!live) return;
        if (err.response?.status !== 401) {
          setError(err.response ? errorMessage(err) : 'Unable to reach UniMarket. Check your connection and try signing in again.');
          return;
        }
        await useAuthStore.getState().checkAuth();
        if (!live) return;
        if (useAuthStore.getState().authUser) navigate('/profile', { replace: true });
        else setError(sessionError);
      } finally { if (live) setLoading(false); }
    }
    restore();
    return () => { live = false; controller.abort(); };
  }, [navigate]);
  useEffect(() => { if (!cooldown) return; const timer = setTimeout(() => setCooldown(cooldown - 1), 1000); return () => clearTimeout(timer); }, [cooldown]);
  async function submit(e) { e.preventDefault(); setBusy(true); setError(''); try { await axiosInstance.post('/auth/google/complete', { username, code }, { timeout: 15000 }); removeAuthToken(); await useAuthStore.getState().checkAuth(); if (!useAuthStore.getState().authUser) { setPending(null); setError(sessionError); return; } navigate('/profile', { replace: true }); } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); } }
  async function resend() { setBusy(true); try { await axiosInstance.post('/auth/google/resend'); setCooldown(60); setError('A new code has been sent.'); } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); } }
  return <AuthFrame title="Welcome to UniMarket">{loading && <p role="status">Finishing Google sign-in…</p>}{pending && <form className="auth-fields" onSubmit={submit}><p className="auth-intro">{pending.email}</p>{pending.needsUsername && <UsernameField value={username} onChange={e => setUsername(e.target.value)} />}{pending.needsCode && <><p className="auth-hint">Confirm email ownership with the code sent to your inbox to securely connect your Google account.</p><label htmlFor="google-code">6-digit email code</label><input id="google-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} required /><button className="secondary_button" type="button" disabled={busy || cooldown > 0} onClick={resend}>{cooldown ? `Resend in ${cooldown}s` : 'Resend code'}</button></>}<button className="send_button" disabled={busy}>{busy ? 'Please wait…' : pending.needsUsername ? 'Confirm username and continue' : 'Connect Google and sign in'}</button></form>}{error && <p role="alert" className="auth-error">{error}</p>}<Link to="/login" className="auth-link">Back to sign in</Link></AuthFrame>;
}
