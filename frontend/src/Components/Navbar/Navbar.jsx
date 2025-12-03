import "./Navbar.css";

export default function Navbar() {
  return (
    <div className="navbar-container">
      <Logo />
      <Search />
      <div className="icon-container">
        {/* TOP RIGHT CHAT
      <div className="top-chat-icon" onClick={() => navigate("/chat")}>
        <MessageCircle size={22} />
      </div> */}
      </div>
    </div>
  );
}

function Logo() {
  return (
    <div className="logo">
      Uni<span>Market</span>
    </div>
  );
}

function Search() {
  return (
    <form className="search-form">
      <input type="text" placeholder="🔍 Search by categories..." />
      <button type="button" className="search-button">
        Search
      </button>
    </form>
  );
}
