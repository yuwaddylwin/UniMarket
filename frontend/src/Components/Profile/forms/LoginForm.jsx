import React, { useState } from "react";
import { useAuthStore } from "../../store/useAuthStore";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import "./SignUpForm.css";
import { Eye, EyeOff } from "lucide-react";

export default function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [needsVerification, setNeedsVerification] = useState(false);

  const { login, isLoggingIn } = useAuthStore();

  const validateForm = () => {
    if (!formData.email.trim()) return toast.error("Email is required");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      return toast.error("Invalid email format");
    if (!formData.password) return toast.error("Password is required");
    return true;
  };

  const clearForm = () => setFormData({ email: "", password: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setNeedsVerification(false);
    const ok = validateForm();
    if (ok !== true) return;

    try {
      await login({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });
      clearForm();
      navigate(location.state?.from || "/", { replace: true });
    } catch (err) {
      if (
        err.response?.status === 401 &&
        err.response?.data?.message ===
          "Please verify your email before logging in."
      ) {
        setNeedsVerification(true);
      }
    }
  };

  return (
    <div className="profile">
      <form className="login-form" onSubmit={handleSubmit}>
        <h1>Login</h1>

        <label htmlFor="login-email">Email address</label>
        <input
          id="login-email"
          type="email"
          placeholder="Enter your email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          autoComplete="email"
          required
        />

        <label htmlFor="login-password">Password</label>
        <div className="password-container">
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff size={18} aria-hidden="true" />
            ) : (
              <Eye size={18} aria-hidden="true" />
            )}
          </button>
        </div>

        <div className="links">
          <span className="span">Don't have an account?</span>
          <button type="button" className="link" onClick={() => navigate("/signup")}>
            Sign Up
          </button>
        </div>

        <button type="submit" className="send_button" disabled={isLoggingIn}>
          {isLoggingIn ? "Logging In..." : "Login"}
        </button>

        {needsVerification && (
          <button
            type="button"
            className="secondary_button"
            onClick={() =>
              navigate("/resend-verification", {
                state: { email: formData.email.trim().toLowerCase() },
              })
            }
          >
            Resend Verification Email
          </button>
        )}
      </form>
    </div>
  );
}
