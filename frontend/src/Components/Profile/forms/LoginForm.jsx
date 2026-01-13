import React, { useState } from "react";
import { useAuthStore } from "../../store/useAuthStore";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import "./SignUpForm.css";

export default function LoginForm() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

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
    const ok = validateForm();
    if (ok !== true) return;

    try {
      // login should throw on error OR return a truthy success value
      const res = await login(formData);

      // If your login doesn't return anything, just rely on "no throw" = success
      if (res === false) return;

      clearForm();
      navigate("/", { replace: true });
    } catch (err) {
    }
  };

  return (
    <div className="profile">
      <form className="login-form" onSubmit={handleSubmit}>
        <h1>Login</h1>

        <input
          type="email"
          placeholder="Enter your email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />

        <div className="password-container">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
          />
          <span
            className="password-toggle"
            onClick={() => setShowPassword((s) => !s)}
            role="button"
            tabIndex={0}
          >
            {showPassword ? "Hide" : "Show"}
          </span>
        </div>

        <div className="links">
          <span className="span">Don't have an account?</span>
          <span className="link" onClick={() => navigate("/signup")}>
            Sign Up
          </span>
        </div>

        <button type="submit" className="send_button" disabled={isLoggingIn}>
          {isLoggingIn ? "Logging In..." : "Login"}
        </button>
      </form>
    </div>
  );
}
