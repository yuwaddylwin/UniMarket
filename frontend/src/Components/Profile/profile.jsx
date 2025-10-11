import React from 'react';
import { useState } from 'react';
import './profile.css';

function Profile() {
    const [showsignup, setshowsignup] = useState(false);

    const handleProfileClick = () => {
        setshowsignup(!showsignup);
    }
  return (
    <>
        <div className="profile-icon" onClick={handleProfileClick}>
                <img src="/Images/user.png" alt="User" />
        </div>
        
        {showsignup && (<div className="profile">
                <form className="login-form">
                <h1>Sign Up</h1>
                    <input type="text" placeholder="Username"/>
                    <input type="email" placeholder="Enter your student email" />
                    <input type="password" placeholder="Enter your password" />
                        <div className="links">
                            <span className="link">Forgot Password?</span>
                            <span className="link">Login</span>
                        </div>
                        <div className="buttons">
                        <button type="submit">Sign Up</button>
                        </div>
                </form>
        </div>
    )}
    </>
  );
}

export default Profile;
