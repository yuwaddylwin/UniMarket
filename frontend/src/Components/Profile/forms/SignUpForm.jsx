import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { AuthFrame, UsernameField, GoogleButton, AuthLinks, errorMessage } from './AuthShared';
export default function SignUpForm() {
  const navigate = useNavigate();
  const { signup, isSigningUp } = useAuthStore();
  const [form, setForm] = useState({ fullName: '', username: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const field = key => ({ value: form[key], onChange: e => setForm({ ...form, [key]: e.target.value }) });
  async function submit(e) {
    e.preventDefault(); setError('');
    if (form.password !== form.confirm) return setError('Passwords do not match.');
    try { await signup({ fullName: form.fullName, username: form.username, email: form.email, password: form.password }); navigate('/verify-code', { state: { email: form.email } }); }
    catch (err) { if (err.response?.status === 502) navigate('/verify-code', { state: { email: form.email, deliveryFailed: true } }); else setError(errorMessage(err)); }
  }
  return <AuthFrame title="Create your account"><p className="auth-intro">Your campus. Your community. Your marketplace.</p><form className="auth-fields" onSubmit={submit}>
    <label htmlFor="signup-name">Name</label><input id="signup-name" {...field('fullName')} autoComplete="name" minLength={2} maxLength={80} required />
    <UsernameField {...field('username')} />
    <label htmlFor="signup-email">Email</label><input id="signup-email" {...field('email')} type="email" autoComplete="email" maxLength={254} required />
    <label htmlFor="signup-password">Password</label><input id="signup-password" {...field('password')} type="password" autoComplete="new-password" minLength={8} required /><small className="auth-hint">Use at least 8 characters.</small>
    <label htmlFor="signup-confirm">Confirm password</label><input id="signup-confirm" {...field('confirm')} type="password" autoComplete="new-password" required />
    {error && <p role="alert" className="auth-error">{error}</p>}<button className="send_button" disabled={isSigningUp}>{isSigningUp ? 'Creating account…' : 'Create account'}</button>
  </form><GoogleButton /><AuthLinks signup /></AuthFrame>;
}
