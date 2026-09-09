import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from '../../common/BrandLogo';
import { axiosInstance } from '../../lib/axios';
import { API_BASE_URL } from '../../../config/api';
import './SignUpForm.css';
export function AuthFrame({ title, children }) {
  return <main className="auth-page"><section className="login-form auth-card"><BrandLogo /><h1>{title}</h1>{children}</section></main>;
}
export function GoogleButton() {
  const [enabled, setEnabled] = useState(false);
  const [retry, setRetry] = useState(0);
  const [message, setMessage] = useState('Checking Google sign-in…');
  useEffect(() => { let live = true; axiosInstance.get('/auth/google/config', { timeout: 20000 }).then(({ data }) => { if (live) { setEnabled(data?.enabled === true); setMessage(data.message || 'Google sign-in is not available yet.'); } }).catch(error => { if (live) setMessage(error.code === 'API_HTML_RESPONSE' ? error.message : 'Unable to reach Google sign-in. Check your connection and try again.'); }); return () => { live = false; }; }, [retry]);
  return <><div className="auth-divider">or</div><button type="button" className="secondary_button google-button" disabled={!enabled} onClick={() => { window.location.assign(`${API_BASE_URL}/auth/google`); }}><span aria-hidden="true">G</span> Continue with Google</button>{!enabled && <small className="auth-hint">{message} <button type="button" className="auth-link" onClick={() => setRetry(value => value + 1)}>Retry</button></small>}</>;
}
export function UsernameField({ value, onChange }) {
  const [feedback, setFeedback] = useState('Use 3–30 letters, numbers, or underscores.');
  useEffect(() => {
    if (!value) { setFeedback('Use 3–30 letters, numbers, or underscores.'); return; }
    if (!/^[a-z0-9_]{3,30}$/i.test(value)) { setFeedback('Use 3–30 letters, numbers, or underscores.'); return; }
    setFeedback('Checking availability…');
    const controller = new AbortController();
    const timer = setTimeout(() => axiosInstance.get('/auth/username', { params: { username: value }, signal: controller.signal }).then(({ data }) => setFeedback(data.message)).catch(() => { if (!controller.signal.aborted) setFeedback('Unable to check availability. Try again.'); }), 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [value]);
  return <><label htmlFor="auth-username">Username</label><input id="auth-username" value={value} onChange={onChange} autoComplete="username" autoCapitalize="none" spellCheck={false} minLength={3} maxLength={30} pattern="[A-Za-z0-9_]{3,30}" required aria-describedby="username-feedback username-permanent" /><small id="username-feedback" role="status">{feedback}</small><small id="username-permanent" className="auth-hint">Your @username is permanent. You can change your display name later.</small></>;
}
export function AuthLinks({ signup = false }) { return <p className="links">{signup ? 'Already have an account?' : "Don't have an account?"} <Link to={signup ? '/login' : '/signup'}>{signup ? 'Sign in' : 'Sign up'}</Link></p>; }
export const errorMessage = error => error.response?.data?.message || (error.code === 'API_HTML_RESPONSE' ? error.message : '') || 'Something went wrong. Please try again.';
