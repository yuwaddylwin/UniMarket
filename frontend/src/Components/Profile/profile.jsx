import React from "react";
import "./profile.css";
import { useProfileLogic } from "../Logics/useProfile";

import SignUpForm from "./forms/SignUpForm";
import LoginForm from "./forms/LoginForm";
import ResetForm from "./forms/ResetForm";
import VerifyForm from "./forms/VerifyForm";
import NewPasswordForm from "./forms/NewPasswordForm";

export default function Profile() {
  const {
    form,
    showSignUp,
    showLogin,
    showReset,
    showVerify,
    showNewPassword,
  } = useProfileLogic();

  return (
    <>
      {/* Profile Icon */}
      <div className="profile-icon" onClick={showSignUp}>
        <img src="/Images/user.png" alt="User" />
      </div>

      {/* Conditional Rendering */}
      {form === "signup" && <SignUpForm showLogin={showLogin} />}
      {form === "login" && (
        <LoginForm showReset={showReset} showSignUp={showSignUp} />
      )}
      {form === "reset" && (
        <ResetForm showVerify={showVerify} showSignUp={showSignUp} />
      )}
      {form === "verify" && (
        <VerifyForm showNewPassword={showNewPassword} showSignUp={showSignUp} />
      )}
      {form === "new_pw" && <NewPasswordForm />}
    </>
  );
}
