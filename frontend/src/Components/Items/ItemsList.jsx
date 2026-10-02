import ViewAllLink from "../common/ViewAllLink";
import React, { useEffect, useRef, useState } from "react";
import "./ItemsList.css";
import { useItemsList } from "../../hooks/useItemsList";
import LoadingSpinner from "../common/LoadingSpinner";
import ItemListingCard from "./ItemListingCard";

export default function ItemsList() {
  const { items, isLoading, error } = useItemsList();

  const scrollerRef = useRef(null);
  const [showArrows, setShowArrows] = useState(false);

  // show arrows only on tablet/laptop/PC
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 600px)");
    const update = () => setShowArrows(mq.matches);
    update();

    // support older browsers
    if (mq.addEventListener) mq.addEventListener("change", update);
    else mq.addListener(update);

    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", update);
      else mq.removeListener(update);
    };
  }, []);

  const filteredItems = items;

  const scrollByCards = (dir) => {
    const el = scrollerRef.current;
    if (!el) return;

    const firstCard = el.querySelector(".item-card");
    const cardW = firstCard?.getBoundingClientRect().width || 280;

    // CSS gaps: 12 mobile, 14 tablet, 16 desktop
    const gap = window.matchMedia("(min-width: 900px)").matches
      ? 16
      : window.matchMedia("(min-width: 600px)").matches
        ? 14
        : 12;

    // scroll about 2 cards at a time for ItemsList
    const amount = (cardW + gap) * 2;

    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  return (
    <div className="items-container">
      <div className="items-header">
        <div>
          <span className="items-eyebrow">Fresh from your community</span>
          <h2>Popular Items</h2>
        </div>
        <ViewAllLink to="/products" label="View all items" />
      </div>

      <div className="il-wrap">
        {showArrows && !isLoading && !error && filteredItems.length > 0 && (
          <button
            className="il-arrow il-left"
            type="button"
            aria-label="Scroll left"
            onClick={() => scrollByCards(-1)}
          >
            ←
          </button>
        )}

        <div
          className={`items-grid ${
            isLoading || error || filteredItems.length === 0
              ? "items-grid--state"
              : ""
          }`}
          ref={scrollerRef}
        >
          {isLoading ? (
            <LoadingSpinner className="items-loading" label="Loading items…" />
          ) : error ? (
            <div className="items-state items-state--error" role="alert">
              <strong>We couldn't load the items.</strong>
              <span>{error}</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <p className="items-state">No items found.</p>
          ) : (
            filteredItems.map((item) => (
              <ItemListingCard item={item} key={item._id} />
            ))
          )}
        </div>

        {showArrows && !isLoading && !error && filteredItems.length > 0 && (
          <button
            className="il-arrow il-right"
            type="button"
            aria-label="Scroll right"
            onClick={() => scrollByCards(1)}
          >
            →
          </button>
        )}
      </div>
    </div>
  );
}
