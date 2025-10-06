import React from 'react';
import './Home.css';
import Navbar from '../Navbar/Navbar';

export default function Home() {
  return(
    <div className="home-container">
      <Navbar/>
      <div className="hero-section">
        <main className="hero-text">
          <h1>WHAT's UniMarket??</h1>
          <h2>A Second-Hand Market Platform for Uni Students</h2>
          <h2>Buy & Sell Things and Services</h2>
        </main>
        <div className="hero-image">
          <img className="img" src='/Images/students1.jpg' alt="UniMarket Platform"></img>
        </div>
      </div>
      <button className="btn">Start Selling</button>
    </div>
  )
}