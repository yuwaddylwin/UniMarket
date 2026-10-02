import { useEffect } from "react";
import { Link } from "react-router-dom";
import Footer from "../Components/Footer/footer";
import { CONTACT } from "../config/contact";
import "./LegalPage.css";

const contact = <a href={CONTACT.emailHref}>{CONTACT.email}</a>;
const privacy = [
  [
    "about",
    "About this policy",
    <p>
      UniMarket is a marketplace built for student life: discovering items,
      posting accommodation and contacting listing owners. This policy explains
      the information used to provide those features. Contact the UniMarket team
      at {contact} in {CONTACT.address} about privacy questions.
    </p>,
  ],
  [
    "collect",
    "Information we collect",
    <>
      <p>
        When you create an account, we collect your name, email address and
        password. We store a password hash, a username where present,
        email-verification information, account dates and the profile photo you
        choose to upload.
      </p>
      <p>
        Listings contain titles, descriptions, prices, categories or
        accommodation types, images and the account that posted them.
        Accommodation can also include location, rent period, bedroom count and
        optional contact information. Listing status and dates help manage
        active and sold listings.
      </p>
      <p>
        Chat records include participants, message text or images, sending dates
        and read status. We also store block relationships and reports,
        including the reason, participants, conversation reference and review
        status. Your profile preferences include language and
        message/notification alert settings.
      </p>
    </>,
  ],
  [
    "use",
    "Why we use it",
    <>
      <p>
        We use this information to create and authenticate accounts, verify
        email addresses, display and manage listings, deliver messages and read
        receipts, apply blocks, and help administrators review reports. Account
        and service records also help investigate errors and abuse.
      </p>
      <p>
        Some information is necessary to provide the feature you request.
        Without account details, you cannot register; without listing details,
        you cannot publish a listing. A profile photo and accommodation contact
        details are optional. Depending on the purpose and applicable law,
        processing may be necessary to provide the requested service, protect
        legitimate security interests, meet legal obligations, or rely on
        consent where required.
      </p>
    </>,
  ],
  [
    "visibility",
    "What other people can see",
    <>
      <p>
        Listings and their photos are publicly browsable. Your display name and
        profile photo appear with your listings and in chat; your username may
        appear in account-related views. Location and contact details you put in
        an accommodation listing can be seen by visitors. Avoid publishing your
        private address, identity documents or other sensitive information
        unnecessarily.
      </p>
      <p>
        Your chat partner receives your messages and can see read receipts and
        online status. Messages are stored on the server; UniMarket does not
        offer end-to-end encrypted chat. Reports are stored for administrative
        review with the reporter’s and reported account’s IDs, the reason and
        conversation reference. Reporting does not automatically send the report
        to the reported user.
      </p>
    </>,
  ],
  [
    "storage",
    "Browser storage and technical information",
    <>
      <p>
        UniMarket uses a sign-in cookie and browser local storage to maintain
        authentication. Saved listings are stored with your account so you can
        return to them after signing in again; they are not purchase records.
        Clearing browser storage can sign you out.
      </p>
      <p>
        Requests to hosting, database, image and email infrastructure involve
        technical information such as IP addresses and request or delivery
        details. Error and operational logs can help diagnose service problems.
        The current application does not integrate a dedicated advertising or
        analytics tracker.
      </p>
    </>,
  ],
  [
    "providers",
    "Service providers",
    <>
      <p>
        The deployed website and API use Render hosting. Application records are
        stored in MongoDB, and uploaded listing, profile and chat images use
        Cloudinary. Verification emails are sent through the server’s configured
        email provider.
      </p>
      <p>
        Authentication is managed by UniMarket’s own backend. These providers
        process the information needed to supply their services. Processing or
        storage may take place outside Thailand, depending on provider
        infrastructure. You can ask us about the providers and applicable
        arrangements for your data.
      </p>
    </>,
  ],
  [
    "security",
    "Keeping information secure",
    <p>
      The application hashes passwords, authenticates protected requests and
      checks message permissions on the server. Email and database credentials
      are kept on the backend. No online service can guarantee complete
      security. Use a unique password, protect your verification links and sign
      out on shared devices.
    </p>,
  ],
  [
    "retention",
    "Retention and deletion",
    <>
      <p>
        Account, listing and message records remain in the service until removed
        through an available feature or an administrative process. There is
        currently no automatic retention schedule. Marking a listing sold
        archives it; it does not delete it. You can edit or delete your own
        listings, remove your profile photo and unblock accounts.
      </p>
      <p>
        Delete All Chat removes the conversation’s messages from the database
        for both participants. It does not withdraw a report or guarantee
        removal of uploaded chat images, email notifications, provider backups,
        or copies saved by another person. Listing and profile image removal
        requests are sent to image storage, but failed cleanup or provider
        retention can delay removal.
      </p>
      <p>
        Some records may need to be retained for unresolved reports, security
        investigations or legal obligations. Contact us if you need a broader
        deletion request reviewed.
      </p>
    </>,
  ],
  [
    "rights",
    "Your choices and rights in Thailand",
    <>
      <p>
        Under Thailand’s Personal Data Protection Act (PDPA), applicable rights
        can include access and copies, correction, erasure, restriction,
        objection, and data portability. Where processing relies on consent, you
        may withdraw it without affecting earlier lawful processing. Rights
        depend on the circumstances and legal exceptions, including the rights
        of others. You may also complain to Thailand’s Personal Data Protection
        Committee.
      </p>
      <p>
        Email {contact} to request help. Tell us the account email and what you
        want us to review; do not send your password. We may need to verify
        account ownership. There is currently no self-service account-deletion
        or data-export button. A request by email starts a review; it is not an
        instant deletion.
      </p>
      <p>
        You can change your display name and alert preferences in{" "}
        <Link to="/profile/settings">Profile Settings</Link>. Your username is
        currently read-only. Turning off alerts does not delete messages or
        block their senders.
      </p>
      <p className="legal-source">
        Reference:{" "}
        <a
          href="https://www.dip.go.th/en/category/2021-11-29-14-10-40/2022-12-16-10-34-36"
          target="_blank"
          rel="noreferrer"
        >
          Data subject rights — Thailand’s Department of Industrial Promotion
        </a>
        .
      </p>
    </>,
  ],
  [
    "updates",
    "Updates and contact",
    <p>
      This page shows when it was last updated. Important changes will be
      identified on this page so you can review them before continuing to share
      information. For a privacy request or a question about a change, contact{" "}
      {contact}.
    </p>,
  ],
];
const terms = [
  [
    "about",
    "About UniMarket",
    "UniMarket helps students discover second-hand items and accommodation and communicate with listing owners. It provides listings and messaging; it does not process payments, arrange delivery, hold deposits or provide rental contracts.",
  ],
  [
    "using",
    "Using the community",
    "Use UniMarket lawfully and respectfully. The service is intended for university students, but email verification is not proof of student status, identity, ownership or trustworthiness. If you are not legally able to enter an agreement yourself, involve a parent or guardian as required.",
  ],
  [
    "accounts",
    "Your account",
    "Provide accurate account information, verify your email and keep your password private. You are responsible for activity you authorize through your account. Tell us if you suspect unauthorized access. Do not impersonate another person or use another person’s account without permission.",
  ],
  [
    "listings",
    "Accurate listings",
    "Only offer items or accommodation you are entitled to list. Keep titles, prices, descriptions, photos, availability and contact information accurate. Describe defects and important conditions clearly. Use images you have permission to share and avoid exposing someone else’s private information. Edit outdated details and mark unavailable listings sold or remove them. You retain rights in your content; submitting it allows UniMarket to store and display it as needed to operate the features you use.",
  ],
  [
    "prohibited",
    "What is not allowed",
    "Do not post illegal goods, stolen property, counterfeit or infringing content, fake listings or misleading offers. Fraud, scams, harassment, threats, impersonation, spam and abuse of messaging or reporting are not allowed. Do not try to bypass blocks, access other accounts, exploit security controls or disrupt the service.",
  ],
  [
    "accommodation",
    "Accommodation needs extra care",
    "Accommodation details are supplied by the person posting. UniMarket does not verify property ownership, permission to let, legality, quality, availability or safety. It does not inspect properties or guarantee rental agreements or deposits. Before paying or signing, inspect the accommodation, verify the person’s authority and agree on rent, fees, deposit conditions and written terms directly.",
  ],
  [
    "transactions",
    "Making arrangements directly",
    "Buyers, sellers and accommodation contacts agree directly on inspection, price, payment, handover and any rental arrangements. Saved listings collect items and accommodation of interest; saving something does not reserve it, place an order or complete payment. UniMarket does not provide escrow, buyer protection, refunds or transaction guarantees. Check what you are receiving before paying and choose a safe meeting place.",
  ],
  [
    "messages",
    "Messaging",
    "Use chat for respectful, relevant communication. Do not send unsolicited promotions, threats, fraudulent payment requests or sensitive documents unnecessarily. Chat includes timestamps and read receipts. Deleting all chat removes messages for both participants, so consider whether you need a record before deleting. Others may have kept copies.",
  ],
  [
    "safety",
    "Reporting and blocking",
    "The conversation menu lets you submit a report with a reason and block another account. Blocking prevents new messages in either direction while the block exists; it does not delete earlier messages. You can unblock in Profile Settings → Blocked or in the chat menu. Administrators may review reports and take appropriate action, but submission does not guarantee a particular outcome or response time. Do not use reporting to harass others. For immediate danger, seek local emergency assistance.",
  ],
  [
    "moderation",
    "Content and account restrictions",
    "Subject to applicable law, UniMarket may remove content or restrict use where needed to address rule violations, fraud, security threats or legal requirements. This may involve administrative action rather than an automated process. Contact us if you believe a restriction was mistaken. You can delete your own listings; requests for account or broader data deletion should be sent by email.",
  ],
  [
    "availability",
    "Service availability",
    "Features may change, be interrupted, suspended or discontinued. Maintenance, network problems and third-party outages can affect access, messages and notifications. Keep your own copies of records you need. UniMarket does not promise uninterrupted availability.",
  ],
  [
    "limits",
    "Understanding the limits",
    "Listings and user messages come from their authors. UniMarket cannot guarantee their accuracy or that another user will fulfil an agreement. Take reasonable care when relying on an offer. These terms do not exclude rights or responsibilities that cannot lawfully be excluded under applicable law.",
  ],
  [
    "changes",
    "Changes to these terms",
    "We will publish revised terms here with an updated date and identify important changes on this page. Please review those changes before continuing to use the affected features. Where applicable law requires further notice or consent, that requirement still applies.",
  ],
  [
    "contact",
    "Talk to us",
    <p>
      Questions, concerns or requests about these terms can be sent to {contact}
      . You can also reach the UniMarket contact number at{" "}
      <a href={CONTACT.phoneHref}>{CONTACT.phone}</a>. Our listed location is{" "}
      {CONTACT.address}.
    </p>,
  ],
];

export function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      eyebrow="Your information, explained"
      summary="Know what you share, where it goes, and the choices available to you."
      sections={privacy}
    />
  );
}
export function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      eyebrow="A thoughtful community"
      summary="Clear expectations for listing, chatting and making arrangements on UniMarket."
      sections={terms}
    />
  );
}
function LegalPage({ title, eyebrow, summary, sections }) {
  useEffect(() => {
    document.title = `${title} | UniMarket`;
    window.scrollTo(0, 0);
  }, [title]);
  return (
    <>
      <main className="legal-page">
        <header className="legal-heading">
          <span className="legal-eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{summary}</p>
          <span className="legal-date">
            Last Updated: <time dateTime="2026-09-05">5 September 2026</time>
          </span>
        </header>
        <div className="legal-layout">
          <nav className="legal-toc" aria-label={`${title} contents`}>
            <strong>On this page</strong>
            {sections.map(([id, heading], i) => (
              <a key={id} href={`#${id}`}>
                {String(i + 1).padStart(2, "0")} · {heading}
              </a>
            ))}
          </nav>
          <article className="legal-card">
            {sections.map(([id, heading, content], i) => (
              <section id={id} key={id}>
                <h2>
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  {heading}
                </h2>
                {typeof content === "string" ? <p>{content}</p> : content}
              </section>
            ))}
            <Link className="legal-home-link" to="/how-it-works">
              Explore how UniMarket works
            </Link>
          </article>
        </div>
      </main>
      <Footer />
    </>
  );
}
