import { useState } from 'react';

export function useCartPage(initialCartItems) {
  const [cartItems, setCartItems] = useState(initialCartItems);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  const handleDelete = (idToRemove) => {
    // remove by id, not index
    const updatedItems = cartItems.filter(item => item._id !== idToRemove);
    setCartItems(updatedItems);

    setToastMessage('Deleted from cart!');
    setShowToast(true);

    setTimeout(() => {
      setShowToast(false);
    }, 2000);
  };

  return {
    cartItems,
    handleDelete,
    toastMessage,
    showToast,
    setShowToast,
  };
}
