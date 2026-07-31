import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { axiosInstance } from "../Components/lib/axios";
import "./VerificationPages.css";

export default function ResendVerificationPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState(location.state?.email || "");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setIsError(false);
    setIsSubmitting(true);

    try {
      const response = await axiosInstance.post("/auth/resend-verification", {
        email: email.trim().toLowerCase(),
      });
      setMessage(response.data.message);
    } catch (error) {
      setIsError(true);
      setMessage(
        error.response?.data?.message ||
          "Unable to send the verification email. Check your connection and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="verification-page">
      <form className="verification-card" onSubmit={handleSubmit}>
        <h1>Resend verification email</h1>
        <p>Enter the email address you used to create your UniMarket account.</p>
        <label htmlFor="verification-email">Email address</label>
        <input
          id="verification-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Sending…" : "Send Verification Email"}
        </button>
        {message && (
          <p
            className={isError ? "verification-message--error" : "verification-message--success"}
            role={isError ? "alert" : "status"}
          >
            {message}
          </p>
        )}
        <button
          type="button"
          className="verification-link-button"
          onClick={() => navigate("/login")}
        >
          Back to Login
        </button>
      </form>
    </main>
  );
}
