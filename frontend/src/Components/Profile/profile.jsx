import "./profile.css";
import { useEffect } from "react";
import { useProfileLogic } from "../Logics/useProfile";
import { useAuthStore } from "../store/useAuthStore";
import { Toaster } from "react-hot-toast";
import {Loader} from "lucide-react";
import { useNavigate } from "react-router-dom";

import SignUpForm from "./forms/SignUpForm";
import LoginForm from "./forms/LoginForm";
import ResetForm from "./forms/ResetForm";
import VerifyForm from "./forms/VerifyForm";
import NewPasswordForm from "./forms/NewPasswordForm";


export default function Profile() {
  const navigate = useNavigate();
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
    <Toaster/>
      {/* Profile Icon */}
      <div className="profile-icon" onClick={() => {
        console.log("profile is clicked")
        authUser ? navigate("/profile") : showLogin()}}>
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
  )
}