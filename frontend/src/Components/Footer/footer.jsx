import React from "react";
import "./footer.css";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section contact">
          <h4>Contact Us</h4>
          <p><span>Email:</span> unimarket.app.official@gmail.com</p>
          <p><span>Phone:</span> +66 817-374-337</p>
          <p><span>Address:</span> Bangkok, Thailand</p>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} UniMarket. All rights reserved.</p>
      </div>
    </footer>
  );
}
