import { useNavigate } from "react-router-dom";
import ProfileAvatar from "../common/ProfileAvatar";
import { formatListingPrice } from "../common/listingPrice";
import "../common/ListingPrice.css";
import "./ItemsList.css";
import { resolveApiAssetUrl } from "../../config/api";

function getFirstImageSrc(item) {
  const first = item?.images?.[0];
  const url = typeof first === "string" ? first : first?.url || "";
  if (!url) return "/Images/placeholder.png";
  return resolveApiAssetUrl(url, "/Images/placeholder.png");
}

export default function ItemListingCard({ item, showTypeLabel = false }) {
  const navigate = useNavigate();
  const openListing = () => navigate(`/products/${item._id}`);

  return (
    <article
      className="item-card"
      onClick={openListing}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openListing();
        }
      }}
      role="link"
      tabIndex={0}
    >
      <div className="item-img">
        <img
          src={getFirstImageSrc(item)}
          alt={item.title}
          loading="lazy"
          onError={(event) => { event.currentTarget.src = "/Images/placeholder.png"; }}
        />
        {showTypeLabel && <span className="item-type-badge">Item</span>}
      </div>
      <div className="item-body">
        <div className="item-title-price listing-title-price-row">
          <h3 className="item-title">{item.title}</h3>
          <div className="item-price listing-price">{formatListingPrice(item.price)}</div>
        </div>
        {item?.seller?.fullName && (
          <div className="seller-row">
            <ProfileAvatar
              className="seller-pic"
              profilePic={item.seller.profilePic}
              alt={item.seller.fullName}
              loading="lazy"
            />
            <span className="seller-name">{item.seller.fullName}</span>
          </div>
        )}
        <p className="item-desc">{item.description}</p>
      </div>
    </article>
  );
}
