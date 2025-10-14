import React from "react";
import "./footer.css";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        {/* <div className="footer-section links">
          <h4>UniMarket</h4>
          <ul>
            <li><a href="/faq">Q&A</a></li>
            </ul>
        </div> */}

        <div className="footer-section contact">
          <h4>Contact Us</h4>
          <p>Email: support@unimarket.com</p>
          <p>Phone: +66 817-374-337</p>
          <p>Bangkok, Thailand</p>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} UniMarket. All rights reserved.</p>
      </div>
    </footer>
  );
}
