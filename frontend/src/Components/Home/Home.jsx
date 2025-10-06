import React from 'react';
import './Home.css';
import Navbar from '../Navbar/Navbar';


export default function Home() {
    return(
      <div>
        <Navbar/>
        <img className= "img" src='/Images/students1.jpg' alt=""></img>
        <main className="hero-text">
          <h1>WHAT's UniMarket??</h1>
          <h2>A Second Hand Market Platform for Uni Students</h2>
          <h2>Buy & Sell Things and Services</h2>
          <h5>Created by a Student, for Students </h5>
        <button className="btn">Start Selling</button>
        </main>
  
      </div>
    )
  }