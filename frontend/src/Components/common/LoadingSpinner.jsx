import React from "react";
import "./LoadingSpinner.css";

export default function LoadingSpinner({
  label = "Loading…",
  className = "",
}) {
  const classes = ["loading-spinner", className].filter(Boolean).join(" ");

  return (
    <div className={classes} role="status" aria-live="polite">
      <span className="loading-spinner__ring" aria-hidden="true" />
      <span className="loading-spinner__label">{label}</span>
    </div>
  );
}
