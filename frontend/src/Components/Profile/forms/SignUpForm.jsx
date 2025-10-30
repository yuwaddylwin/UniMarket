import React from 'react';

export default function SignUpForm({ showLogin }) {
  return (
    <div className="profile">
      <form className="login-form" onSubmit={(e) => e.preventDefault()}>
        <h1>Sign Up</h1>
        <input type="text" placeholder="Username" />
        <input type="email" placeholder="Enter your student email" />
        <input type="password" placeholder="Enter your password" />
        <div className="links">
          <span className="span">Already have an Account? </span>
          <span className="link" onClick={showLogin}>Login</span>
        </div>
        <div className="send_button">
          <button type="submit">Sign Up</button>
        </div>
      </form>
    </div>
  );
}
