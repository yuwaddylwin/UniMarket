import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";


export default function Items() {
  const { id } = useParams(); // get item id from URL
  const [items, setItems] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetch("http://localhost:8000/api/items")
      .then((res) => res.json())
      .then((data) => {
        setItems(data);

        // find clicked item and set its position as current
        const index = data.findIndex((item) => item._id === id);
        if (index !== -1) setCurrentIndex(index);
      })
      .catch((err) => console.error(err));
  }, [id]);

  // scroll behavior like Instagram feed
  const handleScroll = (e) => {
    const scrollTop = e.target.scrollTop;
    const height = e.target.clientHeight;
    const scrollHeight = e.target.scrollHeight;

    // when user reaches near the bottom, show next item
    if (scrollTop + height >= scrollHeight - 100 && currentIndex < items.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  return (
    <div className="item-page" onScroll={handleScroll}>
      {items.slice(0, currentIndex + 1).map((item) => (
        <div key={item._id} className="item-section">
          <img src={item.image} alt={item.title} className="item-image" />
          <div className="item-info">
            <h3>{item.title}</h3>
            <p className="price">{item.price} Baht</p>
            <p>{item.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
