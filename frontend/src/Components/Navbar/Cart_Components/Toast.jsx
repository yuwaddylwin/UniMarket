import React from 'react';
import './CartPage.css';

export default function Toast({ show, message }) {
  if (!show) return null;

  return (
    <div className="toast-notification">
      <div className="toast-content">
        <span className="toast-message">{message}</span>
      </div>
    </div>
  );
}
