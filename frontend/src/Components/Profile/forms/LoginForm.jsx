import React from 'react';

export default function LoginForm({ showReset, showSignUp }) {
  return (
    <div className="profile">
      <form className="login-form" onSubmit={(e) => e.preventDefault()}>
        <h1>Log In</h1>
        <input type="email" placeholder="Enter your student email" />
        <input type="password" placeholder="Enter your password" />
        <div className="links">
          <span className="link" onClick={showReset}>Forgot Password?</span>
        </div>
        <div className="buttons">
          <button type="submit">Log In</button>
        </div>
        <div className="links">
          <span className="span">Don't have an Account?</span>
          <span className="link" onClick={showSignUp}>SignUp</span>
        </div>
      </form>
    </div>
  );
}
