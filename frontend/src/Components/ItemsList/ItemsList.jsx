import React from 'react';
import {useEffect, useState} from 'react'
import './ItemsList.css'


export default function ItemsList(){
    const [items, setItems] = useState([]);

    // Itemlist Add to Cart function
    const [cartItems, setCartItems] = useState([]);
    const [count , setCount] = useState(0);
      
      const AddtoCart = (itemId) => {
        // check if this item is not already added
        if (!cartItems.includes(itemId)) {
          setCartItems([...cartItems, itemId]); // add this item to the list
          setCount(count + 1); // increase count by 1
        }
      };
      

    useEffect(() => {
        fetch("http://localhost:8000/api/items")
          .then(res => res.json())
          .then(data => setItems(data))
          .catch(err => console.error(err));
      }, []);
    
      
  
      return (
        
        <div className="items-container">
          <h2>For You!</h2>

          {/* View More Page link */}
          <span className='link'>View More</span>

            <div className="items-grid">
            {items.map((item) => (
              <>
              <div className="item-card" key={item._id}>
                <img src={item.image} alt={item.title} />
                <div className="item-content">
                  <h3>{item.title}</h3>
                  <p className="price">{item.price} Baht</p>
                  <p>{item.description}</p>
                </div>
                <div className="btns">
                  <button onClick={() => AddtoCart(item._id)}
                disabled={cartItems.includes(item._id)}>Add to Cart 🛒</button>
                  <button> Talk to Seller 💬</button>
                </div>
              </div>
              </>
            ))}
          </div>
        </div>
      );
}
