import React from 'react';
import {useEffect, useState} from 'react'
import { useNavigate } from 'react-router-dom';
import './ItemsList.css'


export default function ItemsList() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8000/api/items")
      .then(res => res.json())
      .then(data => setItems(data))
      .catch(err => console.error(err));
  }, []);

  // when user clicks an item, go to detail page
  const handleItemClick = () => {
    navigate('/Items');
  };

  return (
    <div className="items-container">
      <h2>For You!</h2>
      <span className='link'>View More</span>

      <div className="items-grid">
        {items.map((item) => (
          <div
            className="item-card"
            key={item._id}
            onClick={ handleItemClick()} // navigate when clicking a card
          >
            <img src={item.image} alt={item.title} />
            <div className="item-content">
              <p className="price">{item.price} Baht</p>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
    
    // {/* <div className="btns">
    //   <button onClick={() => {
    //       AddtoCart(item)}}
    //     disabled={cartItems.includes(item._id)}>
    //       Add to Cart 🛒</button>
    //   <button> Talk to Seller 💬</button>
    // </div> */}