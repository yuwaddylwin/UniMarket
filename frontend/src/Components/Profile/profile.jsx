import React from "react";
import "./profile.css";
import { useEffect } from "react";
import { useProfileLogic } from "../Logics/useProfile";
import { useAuthStore } from "../store/useAuthStore";
import {Loader} from "lucide-react";

import SignUpForm from "./forms/SignUpForm";
import LoginForm from "./forms/LoginForm";
import ResetForm from "./forms/ResetForm";
import VerifyForm from "./forms/VerifyForm";
import NewPasswordForm from "./forms/NewPasswordForm";

export default function Profile() {
  const { authUser, checkAuth, isCheckingAuth} = useAuthStore();
  useEffect(() =>{
    checkAuth();
   }, [checkAuth]);

   console.log({authUser});

  const {
    form,
    showSignUp,
    showLogin,
    showReset,
    showVerify,
    showNewPassword,
   } = useProfileLogic();

  //Loading icon
   if(isCheckingAuth && !authUser) return(
    <div className="flex items-center justify-center h-screen">
      <Loader className="size-10 animate-spin"/>
    </div>
   )

  return (
    <>
      {/* Profile Icon */}
      {/* Haven't Done the showProfile yet , fix this */}
      <div className="profile-icon" onClick={authUser ? () => console.log("Profile coming soon") : showSignUp}>
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
