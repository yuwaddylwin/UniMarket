import React, { useState } from "react";
import "./sell.css";

function Sell() {
  const [item, setItem] = useState({
    name: "",
    price: "",
    description: "",
    image: [],
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setItem({ ...item, [name]: value });
  };

  const handleImageUpload = (e) => {
    setItem({ ...item, image: e.target.files[0] });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(item); 
    alert("Item posted successfully!");
  };

  return (
    <div className="post-container">
      <h1 className="title">Post Your Items & Sell it!</h1>
      <form className="post-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Item Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            required
          />
        </div>

        <div className="form-group">
          <label>Item Name</label>
          <input
            type="text"
            name="name"
            value={item.name}
            onChange={handleChange}
            placeholder="Enter item name"
            required
          />
        </div>

        <div className="form-group">
          <label>Price (THB)</label>
          <input
            type="number"
            name="price"
            value={item.price}
            onChange={handleChange}
            placeholder="Enter price"
            required
          />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            name="description"
            value={item.description}
            onChange={handleChange}
            placeholder="Describe your item..."
            rows="4"
            required
          />
        </div>

        <button type="submit" className="submit-btn">
          Post Item
        </button>
      </form>
    </div>
  );
}
export default Sell;


