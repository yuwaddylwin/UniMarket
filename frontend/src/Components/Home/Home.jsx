import React from "react";
import "./Home.css";
import Navbar from "../Navbar/Navbar";
import ItemsList from "../ItemsList/ItemsList";
import Footer from "../Footer/footer";
import { useNavigate } from "react-router-dom";
import { useHomeLogic } from "../Logics/useHome";
import { useItemStore } from "../store/useItemStore";

export default function Home({ cartItems, setCartItems }) {
  const navigate = useNavigate();
  const { count, AddtoCart } = useHomeLogic(cartItems, setCartItems);

  const items = useItemStore((s) => s.items); //  get all posted items

  return (
    <>
      <div className="home-container">
        <Navbar count={count} />

        <div className="hero-section">
          <main className="hero-text">
            <h1>WHAT's UniMarket??</h1>
            <h2>A Second-Hand Market Platform for Uni Students</h2>
            <h2>Buy & Sell Things and Services</h2>
          </main>

          <div className="hero-image">
            <img
              className="img"
              src="/Images/Logo.jpg"
              alt="UniMarket Platform"
            />
          </div>
        </div>

        <button className="btn" onClick={() => navigate("/sell")}>
          Sell Now
        </button>
      </div>

      {/* pass items here */}
      <ItemsList items={items} AddtoCart={AddtoCart} cartItems={cartItems} />

      <div className="hero-section">
        <main className="hero-text2">
          <h1>How it Works?</h1>
          <h2>
            1. <strong>Sign Up:</strong> Verify with your Student Email to join
            the community.
          </h2>
          <h2>
            2. <strong>List or Browse:</strong> Post Items to Sell or Explore to
            Buy Things.
          </h2>
          <h2>
            3. <strong>Connect & Chat:</strong> Chat with the Sellers or Buyers
            to ask questions.
          </h2>
          <h2>
            4. <strong>Meet up & Complete:</strong> Meet up and finalize the
            deal.
          </h2>
        </main>
      </div>

      <Footer />
    </>
  );
}
