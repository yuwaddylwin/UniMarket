import React from 'react';
import './Navbar.css';

export default function Navbar(){
    return(
        <div className="navbar-container">
            <Logo/>
            <Search/>
            <div className="icon-container">
                <Cart/>
                <Profile/>
            </div>
        </div>
    )
}

function Logo(){
    return <div className="logo">Uni<span>Market</span></div>;
}

function Search(){
    return(
        <form className="search-form">
            <input type='text' placeholder='🔍 Search products...' />
            <button type="button" className="search-button">Search</button>
        </form>
    )
}

function Cart(){
    return(
        <div className="cart-icon">
            <img src="/Images/cart.png" alt="Cart" />
            <div className="cart-badge">3</div>
        </div>
    )
}

function Profile(){
    return (
        <div className="profile-icon">
            <img src="/Images/user.png" alt="User" />
        </div>
    )
}