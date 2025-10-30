import React from 'react';

export default function VerifyForm({ showNewPassword, showSignUp }) {
  return (
    <div className="profile">
      <form className="login-form" onSubmit={(e) => e.preventDefault()}>
        <h1>Enter Verification Code</h1>
        <input type="number" placeholder="Verification Code" />
        <div className="send_button">
          <button type="submit" onClick={showNewPassword}>Confirm</button>
        </div>
        <p>or</p>
        <div className="links">
          <span className="span">Don't have an Account?</span>
          <span className="link" onClick={showSignUp}>SignUp</span>
        </div>
      </form>
    </div>
  );
}
