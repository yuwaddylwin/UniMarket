import React from 'react';
import {useEffect, useState} from 'react'
import './ItemsList.css'


export default function ItemsList({AddtoCart}){
    const [items, setItems] = useState([]);

    useEffect(() => {
        fetch("http://localhost:8000/api/items")
          .then(res => res.json())
          .then(data => setItems(data))
          .catch(err => console.error(err));
      }, []);
    
      return (
        
        <div className="items-container">
          <h2>For You!</h2>
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
                  <button onClick={AddtoCart}> Add to Cart 🛒</button>
                  <button> Talk to Seller 💬</button>
                </div>
              </div>
              </>
            ))}
          </div>
        </div>
      );
}