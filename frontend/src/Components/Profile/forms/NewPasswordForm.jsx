import React from 'react';

export default function NewPasswordForm() {
  return (
    <div className="profile">
      <form className="login-form" onSubmit={(e) => e.preventDefault()}>
        <h1>New Password</h1>
        <input type="password" placeholder="Enter New Password" />
        <input type="password" placeholder="Confirm Password" />
        <div className="send_button">
          <button type="submit">Confirm</button>
        </div>
      </form>
    </div>
  );
}
