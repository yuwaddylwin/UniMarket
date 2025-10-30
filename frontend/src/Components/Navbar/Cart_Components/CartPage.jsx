import React from 'react';
import './CartPage.css';
import Toast from './Toast';
import { useCartPage } from '../../Logics/useCartPage';

export default function CartPage({ cartItems: initialCartItems }) {
  const { cartItems, handleDelete, toastMessage, showToast } = useCartPage(initialCartItems);

  return (
    <>
      {/* 🔔 Toast Notification */}
      <Toast show={showToast} message={toastMessage} />

      <div className="cart-page">
        <h2>Your Cart</h2>

        {cartItems.length === 0 ? (
          <p>Nothing is in your cart.</p>
        ) : (
          <ul>
            {cartItems.map((item) => (
              <li key={item._id}>
                <img src={item.image} alt={item.title} width="50" />
                <span>{item.title}</span>
                <span>{item.price} Baht</span>
                <div className="cart-page-btns">
                  <button className="talk-btn">Talk to Seller 💬</button>
                  <button
                    className="delete-btn"
                    onClick={() => handleDelete(item._id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
