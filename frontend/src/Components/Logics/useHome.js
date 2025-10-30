import { useState } from 'react';

export function useHomeLogic(cartItems, setCartItems) {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const count = cartItems.length;

  const AddtoCart = (item) => {
    // fix the includes logic
    const alreadyInCart = cartItems.some(cartItem => cartItem._id === item._id);
    
    if (!alreadyInCart) {
      setCartItems([...cartItems, item]);
      setToastMessage("Added to cart!");
      setShowToast(true);

      setTimeout(() => {
        setShowToast(false);
      }, 1000);
    } else {
      setToastMessage("Item already in Cart!");
    }
  };

  return {
    showToast,
    setShowToast,
    toastMessage,
    count,
    AddtoCart,
  };
}
