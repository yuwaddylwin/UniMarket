import React from 'react';
import { useState } from 'react';
import './profile.css';

function Profile() {
    // For signup, login, reset, verify, new_pw
    const [form, setForm] = useState(null);

  return (
    <>
    {/* Sign Up */}
        <div className="profile-icon" onClick={()=> setForm("signup")}>
                <img src="/Images/user.png" alt="User" />
        </div>
        
    { form === "signup" && (
        <div className="profile">
            <form className="login-form" onSubmit={(e) => e.preventDefault()}>
                <h1>Sign Up</h1>
                    <input type="text" placeholder="Username"/>
                    <input type="email" placeholder="Enter your student email" />
                    <input type="password" placeholder="Enter your password" />
                        <div className="links">
                        <span className='span'>Already have an Account? </span><span className="link" onClick={()=> setForm("login")}>Login</span>
                        </div>
                        <div className="send_button">
                        <button type="submit">Sign Up</button>
                        </div>
            </form>
         </div>
    )}

    {/* Login */}
    {form === "login" && (
            <div className="profile">
                <form className="login-form" onSubmit={(e)=> e.preventDefault()}>
                <h1>Log In</h1>
                    <input type="email" placeholder="Enter your student email" />
                    <input type="password" placeholder="Enter your password" />
                        <div className="links">
                            <span className="link" onClick={()=> setForm("reset")}>Forgot Password?</span>
                        </div>
                        <div className="buttons">
                        <button type="submit">Log In</button>
                        </div>
                        <div className="links">
                            <span className="span">Don't have an Account?</span><span className="link" onClick={()=> setForm("signup")}>SignUp</span>
                        </div>
                </form>
            </div>
    )}

    {/* Forgot PW  */}
    {form === "reset" && (
            <div className="profile">
                <form className="login-form"onSubmit={(e)=> e.preventDefault()}>
                <h1>Forgot Password?</h1>
                    <input type="email" placeholder="Enter your student email" />
                        <div className="send_button">
                           <button type="submit" onClick={()=> setForm('verify')}>Send</button>
                        </div>
                        <p>or</p>
                        <div className="links">
                            <span className="span">Don't have an Account?</span><span className="link" onClick={()=> setForm("signup")}>SignUp</span>
                        </div>
                </form>
            </div>
    )}
     
     {/* Verification */}
    {form === "verify" && (
            <div className="profile">
                <form className="login-form" onSubmit={(e)=> e.preventDefault()}>
                <h1>Enter Verification Code</h1>
                    <input type="number" placeholder=""/>
                        <div className="send_button">
                           <button type="submit" onClick={()=> setForm("new_pw")}>Confirm</button>
                        </div>
                        <p>or</p>
                        <div className="links">
                            <span className="span">Don't have an Account?</span><span className="link" onClick={()=> setForm("signup")}>SignUp</span>
                        </div>
                </form>
            </div>
    )}

    {/* New PW */}
    {form === "new_pw" && (
            <div className="profile">
                <form className="login-form"onSubmit={(e)=> e.preventDefault()}>
                <h1>New Password</h1>
                    <input type="password" placeholder="Enter New Password"/>
                    <input type="password" placeholder="Confirm Password"/>
                        <div className="send_button">
                           <button type="submit">Confirm</button>
                        </div>
                </form>
            </div>
    )}
    </>
  );
}

export default Profile;
