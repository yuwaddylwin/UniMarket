import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { axiosInstance } from "../Components/lib/axios";
import LoadingSpinner from "../Components/common/LoadingSpinner";
import "./VerificationPages.css";

// React StrictMode intentionally re-runs effects in development. Reuse the same
// request so a successful one-time token is not immediately submitted a second time.
const verificationRequests = new Map();

const getVerificationRequest = (token) => {
  const existingRequest = verificationRequests.get(token);
  if (existingRequest) {
    return existingRequest;
  }

  const request = axiosInstance.get(
    `/auth/verify/${encodeURIComponent(token)}`
  );
  verificationRequests.set(token, request);

  // Allow a genuine failed request to be retried, while retaining successful
  // requests for the lifetime of this page bundle.
  request.catch(() => {
    if (verificationRequests.get(token) === request) {
      verificationRequests.delete(token);
    }
  });

  return request;
};

export default function VerifyEmailPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let active = true;

    const verifyEmail = async () => {
      try {
        const response = await getVerificationRequest(token);

        if (active && response.status === 200) {
          setStatus("success");
        }
      } catch (error) {
        const responseStatus = error.response?.status;

        if (!active) return;

        if (responseStatus === 400 || responseStatus === 404) {
          setStatus("invalid");
        } else {
          setStatus("error");
        }
      }
    };

    if (token) {
      verifyEmail();
    } else {
      setStatus("error");
    }

    return () => {
      active = false;
    };
  }, [token]);

  return (
    <main className="verification-page">
      <section className="verification-card" aria-live="polite">
        {status === "loading" && (
          <>
            <LoadingSpinner label="Verifying your email…" />
            <h1>Verifying your email…</h1>
          </>
        )}

        {status === "success" && (
          <>
            <div className="verification-icon" aria-hidden="true">✓</div>
            <h1>Email verified successfully.</h1>
            <p>Your UniMarket account is ready to use.</p>
            <button type="button" onClick={() => navigate("/login")}>
              Go to Login
            </button>
          </>
        )}

        {status === "invalid" && (
          <>
            <div className="verification-icon verification-icon--error" aria-hidden="true">!</div>
            <h1>Verification link is invalid or expired.</h1>
            <p>Request a new verification link to finish setting up your account.</p>
            <button
              type="button"
              onClick={() => navigate("/resend-verification")}
            >
              Resend Verification Email
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="verification-icon verification-icon--error" aria-hidden="true">!</div>
            <h1>We could not verify your email right now.</h1>
            <p>Please try the verification link again in a moment.</p>
          </>
        )}
      </section>
    </main>
  );
}
