// import React, { useState } from 'react';
import './Navbar.css';
import Profile from '../Profile/profile';



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
    const CartNumber = 0
    return(
        
        <div className="cart-icon">
            <img src="/Images/cart.png" alt="Cart" />
            {CartNumber > 0 && <div className="cart-badge">{CartNumber}</div>}
        </div>
    )
}

