import React from 'react';
import './CartPage.css'

function CartPage({cartItems}){
    return (
        <div className='cart-page'>
            <h2>Your Cart</h2>
        
        {cartItems.length === 0 ? (
            <p>Nothing is in your cart.</p>
        ) : (
            <ul>
          {cartItems.map((item, index) => (
            <li key={index}>
              <img src={item.image} alt={item.title} width="50" />
              <span>{item.title}</span> {item.price} Baht
            </li>
          ))}
        </ul>
        )}
        </div>
    )
}

export default CartPage;