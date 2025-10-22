import React, { useState } from 'react';
import './CartPage.css';

function CartPage({ cartItems: initialCartItems }) {
  const [cartItems, setCartItems] = useState(initialCartItems);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  // 🗑️ Delete item by index
  const handleDelete = (indexToRemove) => {
    const updatedItems = cartItems.filter((_, index) => index !== indexToRemove);
    setCartItems(updatedItems);

    setToastMessage("Deleted from cart!");
    setShowToast(true);

    setTimeout(() => {
      setShowToast(false);
    }, 2000);
  };

  return (
    <>
      {/* 🔔 Toast Notification */}
      {showToast && (
        <div className="toast-notification">
          <div className="toast-content">
            <span className="toast-message">{toastMessage}</span>
          </div>
        </div>
      )}

      <div className='cart-page'>
        <h2>Your Cart</h2>

        {cartItems.length === 0 ? (
          <p>Nothing is in your cart.</p>
        ) : (
          <>
            <ul>
              {cartItems.map((item, index) => (
                <li key={index}>
                  <img src={item.image} alt={item.title} width="50" />
                  <span>{item.title}</span>
                  <span>{item.price} Baht</span>
                  <div className='cart-page-btns'>
                    <button className='talk-btn'>Talk to Seller 💬</button>
                    <button
                      className='delete-btn'
                      onClick={() => handleDelete(index)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  );
}

export default CartPage;
