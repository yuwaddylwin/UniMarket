import "./footer.css";
import { ArrowUpRight, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <section className="footer-brand" aria-label="UniMarket">
          <h3>Uni<span>Market</span></h3>
          <p className="footer-tagline">A student marketplace for useful finds, nearby living, and real campus connections.</p>
          <span className="footer-trust"><ShieldCheck aria-hidden="true" /> Built for safer student exchanges</span>
        </section>

        <section className="footer-section">
          <h4>Help</h4>
          <ul>
            <li><a href="/#home-discovery">How it works <ArrowUpRight aria-hidden="true" /></a></li>
            <li><a href="mailto:unimarket.app.official@gmail.com?subject=UniMarket%20Safety">Safety help <ArrowUpRight aria-hidden="true" /></a></li>
            <li><a href="mailto:unimarket.app.official@gmail.com?subject=UniMarket%20Support">Get support <ArrowUpRight aria-hidden="true" /></a></li>
          </ul>
        </section>

        <section className="footer-section footer-contact">
          <h4>Contact</h4>
          <a href="mailto:unimarket.app.official@gmail.com">
            <Mail aria-hidden="true" />
            <span>unimarket.app.official@gmail.com</span>
          </a>
          <a href="tel:+66817374337">
            <Phone aria-hidden="true" />
            <span>+66 817-374-337</span>
          </a>
          <p>
            <MapPin aria-hidden="true" />
            <span>Bangkok, Thailand</span>
          </p>
        </section>
      </div>
      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} UniMarket. All rights reserved.</p>
        <p>Made for student life in Bangkok.</p>
      </div>
    </footer>
  );
}
