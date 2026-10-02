import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { AuthFrame, AuthLinks, errorMessage } from "./AuthShared";
export default function LoginForm() {
  const [identifier, setIdentifier] = useState(""),
    [password, setPassword] = useState("");
  const location = useLocation(),
    navigate = useNavigate();
  const [error, setError] = useState("");
  const { login, isLoggingIn } = useAuthStore();
  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      await login({ identifier, password });
      const from = location.state?.from;
      navigate(
        typeof from === "string" &&
          from.startsWith("/") &&
          !from.startsWith("//")
          ? from
          : "/",
        { replace: true }
      );
    } catch (err) {
      if (err.response?.data?.code === "EMAIL_UNVERIFIED") {
        navigate("/verify-code", { state: { email: err.response.data.email, needsCode: true } });
      } else setError(errorMessage(err));
    }
  }
  return (
    <AuthFrame title="Welcome back">
      <p className="auth-intro">Sign in to your UniMarket community.</p>
      <form className="auth-fields" onSubmit={submit}>
        <label htmlFor="login-identifier">Username or email</label>
        <input
          id="login-identifier"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
        />
        <label htmlFor="login-password">Password</label>
        <input
          id="login-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          autoComplete="current-password"
          required
        />
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        <button className="send_button" disabled={isLoggingIn}>
          {isLoggingIn ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <Link className="auth-link" to="/forgot-password">
        Forgot password?
      </Link>
      <Link className="auth-link" to="/verify-code">
        Verify your email / resend code
      </Link>
      <AuthLinks />
    </AuthFrame>
  );
}
