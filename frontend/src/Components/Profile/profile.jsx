import React from 'react';
import { useState } from 'react';
import './profile.css';

function Profile() {
    // Sign Up and Log in 
    const [showsignup, setshowsignup] = useState(false);
    const [showlogin, setshowlogin] = useState(false);

    const handleProfileClick = () => {
        setshowsignup(!showsignup);
        setshowlogin(false);
    }
    
    const handleLoginClick = () => {
        setshowsignup(false);
        setshowlogin(!showlogin);
    }

  return (
    <>
    {/* Sign Up */}
        <div className="profile-icon" onClick={handleProfileClick}>
                <img src="/Images/user.png" alt="User" />
        </div>
        
        {showsignup && (
            <div className="profile">
                <form className="login-form">
                <h1>Sign Up</h1>
                    <input type="text" placeholder="Username"/>
                    <input type="email" placeholder="Enter your student email" />
                    <input type="password" placeholder="Enter your password" />
                        <div className="links">
                        <span className='span'>Already have an Account? </span><span className="link" onClick={handleLoginClick}>Login</span>
                        </div>
                        <div className="buttons">
                        <button type="submit">Sign Up</button>
                        </div>
                </form>
            </div>
    )}

    {/* Login */}
    {showlogin && (
            <div className="profile">
                <form className="login-form">
                <h1>Log In</h1>
                    <input type="email" placeholder="Enter your student email" />
                    <input type="password" placeholder="Enter your password" />
                        <div className="links">
                            <span className="link">Forgot Password?</span>
                        </div>
                        <div className="buttons">
                        <button type="submit">Log In</button>
                        </div>
                        <div className="links">
                            <span className="span">Don't have an Account?</span><span className="link" onClick={handleProfileClick}>SignUp</span>
                        </div>
                </form>
            </div>
    )}
    </>
  );
}

export default Profile;
