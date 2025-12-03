import toast from "react-hot-toast";

export function useHomeLogic(cartItems, setCartItems) {

  const count = cartItems.length;

  const AddtoCart = (item) => {
    const alreadyInCart = cartItems.some(cartItem => cartItem._id === item._id);

    if (alreadyInCart) {
      toast("Already in cart!");
      return;
    }

    setCartItems([...cartItems, item]);
    toast.success("Added to cart 🛒");
  };

  return {
    count,
    AddtoCart,
  };
}
