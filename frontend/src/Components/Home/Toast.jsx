import React from 'react';
import './Home.css';

export default function Toast({ show, message, onClose }) {
  if (!show) return null;

  return (
    <div className="toast-notification">
      <div className="toast-content">
        <span className="toast-message">{message}</span>
        <button className="toast-close" onClick={onClose}>
          ×
        </button>
      </div>
    </div>
  );
}
