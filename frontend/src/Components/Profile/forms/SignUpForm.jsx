import React, { useState } from "react";
import { useAuthStore } from "../../store/useAuthStore";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import "./SignUpForm.css";
import { Eye, EyeOff } from "lucide-react";

const ALLOWED_DOMAINS = new Set([
  "gmail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "yahoo.com",
  "icloud.com",
  "me.com",
  "proton.me",
  "protonmail.com",
]);

// email validation
const isValidEmail = (email) => {
  const e = email.trim().toLowerCase();

  if (!e) return false;
  if (/\s/.test(e)) return false; // no spaces
  if (e.includes("..")) return false; // no consecutive dots

  const parts = e.split("@");
  if (parts.length !== 2) return false;

  const [local, domain] = parts;
  if (!local || !domain) return false;

  // local part rules
  if (local.startsWith(".") || local.endsWith(".")) return false;
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local)) return false;

  // domain rules
  if (domain.startsWith(".") || domain.endsWith(".")) return false;
  if (!/^[a-z0-9.-]+$/.test(domain)) return false;

  const labels = domain.split(".");
  if (labels.length < 2) return false; // must have a TLD
  if (labels.some((l) => l.length === 0)) return false; // blocks gmail..com
  if (labels.some((l) => l.startsWith("-") || l.endsWith("-"))) return false;

  const tld = labels[labels.length - 1];
  if (!/^[a-z]{2,24}$/.test(tld)) return false; // blocks gmail.c

  // provider rule
  if (!ALLOWED_DOMAINS.has(domain)) return false;

  return true;
};

export default function SignUpForm() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });
  const [registrationComplete, setRegistrationComplete] = useState(false);

  const { signup, isSigningUp } = useAuthStore();

  const validateForm = () => {
    const fullName = formData.fullName.trim();
    const email = formData.email.trim();
    const password = formData.password;

    if (!fullName) return toast.error("Full name is required");
    if (fullName.length < 2) return toast.error("Full name is too short");

    if (!email) return toast.error("Email is required");
    if (!isValidEmail(email)) {
      return toast.error(
        "Invalid email or provider not supported (use Gmail/Outlook/Yahoo/iCloud/Proton)"
      );
    }

    if (!password) return toast.error("Password is required");
    if (password.length < 6)
      return toast.error("Password must be at least 6 characters");

    return true;
  };

  const clearForm = () =>
    setFormData({ fullName: "", email: "", password: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = validateForm();
    if (ok !== true) return;

    try {
      const payload = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      };

      await signup(payload);
      clearForm();
      setRegistrationComplete(true);
    } catch (err) {
      // The account exists when SMTP delivery fails, so guide the user to retry
      // delivery instead of letting them submit a duplicate registration.
      if (err.response?.status === 502) {
        navigate("/resend-verification", {
          state: { email: formData.email.trim().toLowerCase() },
        });
      }
    }
  };

  if (registrationComplete) {
    return (
      <div className="profile">
        <section className="login-form verification-result" aria-live="polite">
          <div className="verification-icon" aria-hidden="true">✓</div>
          <h1>Registration successful!</h1>
          <p>We've sent a verification email to your inbox.</p>
          <p>Please verify your email before logging in.</p>
          <button
            type="button"
            className="send_button"
            onClick={() => navigate("/login", { replace: true })}
          >
            Go to Login
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="profile">
      <form className="login-form" onSubmit={handleSubmit}>
        <h1>Sign Up</h1>

        <label htmlFor="signup-name">Full name</label>
        <input
          id="signup-name"
          type="text"
          placeholder="Full Name"
          value={formData.fullName}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, fullName: e.target.value }))
          }
          autoComplete="name"
          required
        />

        <label htmlFor="signup-email">Email address</label>
        <input
          id="signup-email"
          type="email"
          placeholder="Enter your email"
          value={formData.email}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, email: e.target.value }))
          }
          autoComplete="email"
          required
        />

        <label htmlFor="signup-password">Password</label>
        <div className="password-container">
          <input
            id="signup-password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={formData.password}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, password: e.target.value }))
            }
            autoComplete="new-password"
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
          <span className="span">Already have an account?</span>
          <button type="button" className="link" onClick={() => navigate("/login")}>
            Login
          </button>
        </div>

        <button type="submit" className="send_button" disabled={isSigningUp}>
          {isSigningUp ? "Signing Up..." : "Sign Up"}
        </button>

        {/* Optional: show allowed providers to users */}
        {/* <p className="supported-providers">
          Supported: Gmail only!
        </p> */}
      </form>
    </div>
  );
}
