import React, { useMemo, useRef } from "react";
import ItemCard from "../ItemCard";
import "./ItemCarousel.css";

export default function ItemCarousel({ items = [] }) {
  const scrollerRef = useRef(null);

  const isCarousel = useMemo(() => (items?.length || 0) > 1, [items]);

  const scrollByOneCard = (dir = 1) => {
    const el = scrollerRef.current;
    if (!el) return;

    // Scroll by ~1 card (uses container width so it behaves well on mobile)
    const amount = Math.round(el.clientWidth * 0.82) * dir;
    el.scrollBy({ left: amount, behavior: "smooth" });
  };

  if (!items || items.length === 0) return null;

  // If only one item, render normally (no swipe UI)
  if (!isCarousel) {
    return (
      <div className="items-single">
        <ItemCard item={items[0]} />
      </div>
    );
  }

  return (
    <div className="items-carousel-wrap">
      <div className="items-carousel" ref={scrollerRef}>
        {items.map((it) => (
          <div className="items-slide" key={it._id || it.id || it.title || Math.random()}>
            <ItemCard item={it} />
          </div>
        ))}
      </div>

      {/* Optional arrows (nice on desktop, harmless on mobile) */}
      <button
        className="carousel-btn left"
        type="button"
        aria-label="Previous"
        onClick={() => scrollByOneCard(-1)}
      >
        ‹
      </button>
      <button
        className="carousel-btn right"
        type="button"
        aria-label="Next"
        onClick={() => scrollByOneCard(1)}
      >
        ›
      </button>
    </div>
  );
}
