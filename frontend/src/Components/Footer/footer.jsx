import "./footer.css";
import { ArrowUpRight, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { CONTACT } from "../../config/contact";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <section className="footer-brand" aria-label="UniMarket">
          <h3>
            Uni<span>Market</span>
          </h3>
          <p className="footer-tagline">
            A student marketplace for useful finds, nearby living, and real
            campus connections.
          </p>
          <span className="footer-trust">
            <ShieldCheck aria-hidden="true" /> Built for safer student exchanges
          </span>
        </section>

        <section className="footer-section">
          <h4>Help</h4>
          <ul>
            <li>
              <Link to="/how-it-works">
                How it works <ArrowUpRight aria-hidden="true" />
              </Link>
            </li>
            <li>
              <Link to="/privacy">
                Privacy <ArrowUpRight aria-hidden="true" />
              </Link>
            </li>
            <li>
              <Link to="/terms">
                Terms <ArrowUpRight aria-hidden="true" />
              </Link>
            </li>
          </ul>
        </section>

        <section className="footer-section footer-contact">
          <h4>Contact</h4>
          <a href={CONTACT.emailHref}>
            <Mail aria-hidden="true" />
            <span>{CONTACT.email}</span>
          </a>
          <a href={CONTACT.phoneHref}>
            <Phone aria-hidden="true" />
            <span>{CONTACT.phone}</span>
          </a>
          <p>
            <MapPin aria-hidden="true" />
            <span>{CONTACT.address}</span>
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
