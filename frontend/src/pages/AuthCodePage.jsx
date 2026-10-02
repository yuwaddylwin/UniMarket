import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  AuthFrame,
  errorMessage,
} from "../Components/Profile/AuthShared";
import { axiosInstance, removeAuthToken } from "../lib/axios";
import { useAuthStore } from "../store/useAuthStore";
export default function AuthCodePage({ reset = false }) {
  const location = useLocation(),
    navigate = useNavigate();
  const [email, setEmail] = useState(location.state?.email || "");
  const [code, setCode] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false),
    [cooldown, setCooldown] = useState(
      location.state?.email && !location.state?.deliveryFailed && !location.state?.needsCode ? 60 : 0
    );
  const [message, setMessage] = useState(
    location.state?.deliveryFailed
      ? "Your account was created, but the email could not be sent. Please resend your code."
      : ""
  );
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  async function send() {
    setBusy(true);
    setMessage("");
    try {
      const { data } = await axiosInstance.post(
        reset ? "/auth/forgot-password" : "/auth/resend-verification",
        { email }
      );
      setMessage(data.message);
      setCooldown(60);
    } catch (err) {
      setMessage(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  async function submit(e) {
    e.preventDefault();
    if (reset && password !== confirm)
      return setMessage("Passwords do not match.");
    setBusy(true);
    setMessage("");
    try {
      const { data } = await axiosInstance.post(
        reset ? "/auth/reset-password" : "/auth/verify-code",
        { email, code, ...(reset ? { password } : {}) }
      );
      removeAuthToken();
      if (!reset) useAuthStore.getState().acceptSession(data);
      navigate(reset ? "/login" : "/profile", { replace: true });
    } catch (err) {
      setMessage(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthFrame title={reset ? "Reset your password" : "Check your email"}>
      <p className="auth-intro">
        {reset
          ? "Request a code using your verified email."
          : "Enter the 6-digit code we sent to your email."}{" "}
        Codes expire in 10 minutes.
      </p>
      <form className="auth-fields" onSubmit={submit}>
        <label htmlFor="code-email">Email</label>
        <input
          id="code-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button
          type="button"
          className="secondary_button"
          disabled={busy || cooldown > 0 || !email}
          onClick={send}
        >
          {cooldown ? `Resend in ${cooldown}s` : "Send / resend code"}
        </button>
        <label htmlFor="auth-code">6-digit code</label>
        <input
          id="auth-code"
          className="otp-input"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          onPaste={(event) => {
            event.preventDefault();
            setCode(event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6));
          }}
          value={code}
          onChange={(e) =>
            setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
          }
          required
        />
        {reset && (
          <>
            <label htmlFor="new-password">New password</label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <label htmlFor="confirm-password">Confirm password</label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </>
        )}
        {message && (
          <p role="status" className="auth-hint">
            {message}
          </p>
        )}
        <button className="send_button" disabled={busy}>
          {busy
            ? "Please wait…"
            : reset
              ? "Reset password"
              : "Verify and sign in"}
        </button>
      </form>
      <Link className="auth-link" to="/login">
        Back to sign in
      </Link>
    </AuthFrame>
  );
}
