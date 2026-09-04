import { Link } from "react-router-dom";
import "./LegalPage.css";

export function PrivacyPage() {
  return (
    <LegalPage title="Privacy" eyebrow="Your information">
      <p>
        UniMarket uses the account and listing information you provide to run
        the marketplace, show your listings, and help students communicate.
      </p>
      <h2>Information you share</h2>
      <p>
        This may include your name, email address, profile photo, listing
        details, accommodation contact information, and messages you send.
      </p>
      <h2>Your choices</h2>
      <p>
        You can update your account details from Profile Settings. Be thoughtful
        about personal information included in public listings.
      </p>
    </LegalPage>
  );
}

export function TermsPage() {
  return (
    <LegalPage title="Terms" eyebrow="Using UniMarket">
      <p>
        UniMarket is a student marketplace for listings, accommodation, and
        direct communication between community members.
      </p>
      <h2>Community responsibility</h2>
      <p>
        Provide accurate listing information, communicate respectfully, and
        do not post unlawful, unsafe, deceptive, or infringing content.
      </p>
      <h2>Transactions</h2>
      <p>
        Buyers, sellers, and accommodation hosts are responsible for checking
        details and agreeing on safe exchange arrangements before proceeding.
      </p>
    </LegalPage>
  );
}

function LegalPage({ title, eyebrow, children }) {
  return (
    <main className="legal-page">
      <article className="legal-card">
        <span className="legal-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <div className="legal-content">{children}</div>
        <Link className="legal-home-link" to="/">
          Back to UniMarket
        </Link>
      </article>
    </main>
  );
}
