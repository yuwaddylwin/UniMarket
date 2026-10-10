import { useEffect, useState } from "react";
import "./StartupScreen.css";

// The session endpoint has no measurable byte/task progress. This estimate is
// visual feedback only; readiness is controlled exclusively by the auth store.
export default function StartupScreen({ error, onRetry, ready = false }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (error || ready) return undefined;
    setElapsed(0);
    const started = Date.now();
    const timer = window.setInterval(() => setElapsed(Date.now() - started), 250);
    return () => window.clearInterval(timer);
  }, [error, ready]);

  const progress = ready
    ? 100
    : Math.min(94, Math.floor(8 + 86 * (1 - Math.exp(-elapsed / 7000))));
  const message = ready
    ? "Your marketplace is ready"
    : error
      ? "We couldn't connect"
      : elapsed < 1500
        ? "Connecting to UniMarket…"
        : elapsed < 8000
          ? "Checking your session…"
          : "Still waiting for the server…";

  return (
    <main
      className={`startup-screen${ready ? " startup-screen--complete" : ""}`}
      aria-busy={!error && !ready}
    >
      <section className="startup-card" aria-labelledby="startup-title">
        <img
          className="startup-mark"
          src="/unimarket-icon.svg"
          alt=""
          width="64"
          height="64"
        />
        <p className="startup-brand">UniMarket</p>
        <h1 id="startup-title">Your campus. Your marketplace.</h1>
        <p className="startup-intro">
          Good finds and new connections are on their way.
        </p>
        <div className="startup-status" role={error ? "alert" : "status"}>
          <strong>{message}</strong>
          {error && <p>{error}</p>}
        </div>
        {!error && (
          <>
            <div className="startup-progress-label" aria-hidden="true">
              <span>{ready ? "Session ready" : "Estimated progress"}</span>
              <span>{progress}%</span>
            </div>
            <div
              className="startup-track"
              role="progressbar"
              aria-label="Session initialization"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={ready ? 100 : undefined}
              aria-valuetext={ready
                ? "Ready"
                : "Waiting for session response; progress is estimated"}
            >
              <div className="startup-fill" style={{ width: `${progress}%` }} />
            </div>
            <p className="startup-note">
              {ready
                ? "Opening UniMarket…"
                : elapsed >= 8000
                  ? "The server may be waking up. Thanks for your patience."
                  : "Restoring your session securely. Timing may vary."}
            </p>
          </>
        )}
        {error && (
          <button className="startup-retry" type="button" onClick={() => onRetry()}>
            Retry connection
          </button>
        )}
      </section>
    </main>
  );
}
