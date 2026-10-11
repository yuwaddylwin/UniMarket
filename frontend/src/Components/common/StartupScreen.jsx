import { useEffect, useState } from "react";
import "./StartupScreen.css";

// These messages describe the pending session request without claiming
// measurable progress or an unverified server cold start.
const MESSAGES = [
  "Connecting to UniMarket…",
  "Waiting for your session…",
  "Preparing your campus marketplace…",
  "Still waiting for a response…",
];

export default function StartupScreen({ error, onRetry, ready = false }) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (error || ready) return undefined;
    setMessageIndex(0);
    const timer = window.setInterval(() => {
      setMessageIndex((index) => (index + 1) % MESSAGES.length);
    }, 3500);
    return () => window.clearInterval(timer);
  }, [error, ready]);

  if (ready) return null;

  return (
    <main className="startup-screen">
      <section className="startup-content" aria-labelledby="startup-title">
        <img
          className="startup-mark"
          src="/unimarket-icon.svg"
          alt=""
          width="64"
          height="64"
        />
        <h1 className="startup-brand" id="startup-title">UniMarket</h1>
        <p className="startup-tagline">Your Campus, Your Marketplace.</p>
        {error ? (
          <>
            <p className="startup-error" role="alert">{error}</p>
            <button
              className="startup-retry"
              type="button"
              onClick={() => onRetry()}
            >
              Retry connection
            </button>
          </>
        ) : (
          <>
            <span className="startup-spinner" aria-hidden="true" />
            <p className="startup-status" role="status" aria-atomic="true">
              <span className="startup-message" key={messageIndex}>
                {MESSAGES[messageIndex]}
              </span>
            </p>
          </>
        )}
      </section>
    </main>
  );
}
