import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { AuthFrame, GoogleButton, AuthLinks, errorMessage } from './AuthShared';
export default function LoginForm() {
  const [identifier, setIdentifier] = useState(''), [password, setPassword] = useState('');
  const location = useLocation(), navigate = useNavigate();
  const googleResult = new URLSearchParams(location.search);
  const googleErrors = {
    state: 'Your Google sign-in session expired or its security cookie is missing. Please start again.',
    exchange: 'Google authorization could not be completed. Please start a new sign-in attempt.',
    identity: 'Google could not verify your account information. Please try again.',
    account: 'UniMarket could not finish signing you in. Please try again shortly.',
  };
  const [error, setError] = useState(googleResult.get('google') === 'cancelled' ? 'Google sign-in was cancelled. You can try again.' : googleResult.has('google') ? googleErrors[googleResult.get('reason')] || 'Google sign-in could not be completed. Please try again.' : '');
  const { login, isLoggingIn } = useAuthStore();
  async function submit(e) {
    e.preventDefault(); setError('');
    try { await login({ identifier, password }); const from = location.state?.from; navigate(typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : '/', { replace: true }); }
    catch (err) { setError(errorMessage(err)); }
  }
  return <AuthFrame title="Welcome back"><p className="auth-intro">Sign in to your UniMarket community.</p><form className="auth-fields" onSubmit={submit}>
    <label htmlFor="login-identifier">Username or email</label><input id="login-identifier" value={identifier} onChange={e => setIdentifier(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} required />
    <label htmlFor="login-password">Password</label><input id="login-password" value={password} onChange={e => setPassword(e.target.value)} type="password" autoComplete="current-password" required />
    {error && <p className="auth-error" role="alert">{error}</p>}<button className="send_button" disabled={isLoggingIn}>{isLoggingIn ? 'Signing in…' : 'Sign in'}</button>
  </form><Link className="auth-link" to="/forgot-password">Forgot password?</Link><Link className="auth-link" to="/verify-code">Verify your email / resend code</Link><GoogleButton /><AuthLinks /></AuthFrame>;
}
