import React, { useEffect, useMemo, useRef, useState } from "react";
import ItemCard from "../ItemCardfromProfile";
import "./ItemCarousel.css";

export default function ItemCarousel({ items = [] }) {
  const scrollerRef = useRef(null);
  const [localItems, setLocalItems] = useState(items);

  useEffect(() => {
    setLocalItems(items || []);
  }, [items]);

  const isCarousel = useMemo(
    () => (localItems?.length || 0) > 1,
    [localItems]
  );

  const scrollByOneCard = (dir = 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.round(el.clientWidth * 0.82) * dir;
    el.scrollBy({ left: amount, behavior: "smooth" });
  };

  // ✅ This is ONLY for UI update after ItemCard deletes successfully
  const handleDeleteItem = (id) => {
    setLocalItems((prev) => prev.filter((x) => (x._id || x.id) !== id));
  };

  if (!localItems || localItems.length === 0) return null;

  if (!isCarousel) {
    return (
      <div className="items-single">
        <ItemCard item={localItems[0]} onDeleteItem={handleDeleteItem} />
      </div>
    );
  }

  return (
    <div className="items-carousel-wrap">
      <div className="items-carousel" ref={scrollerRef}>
        {localItems.map((it) => (
          <div className="items-slide" key={it._id || it.id}>
            <ItemCard item={it} onDeleteItem={handleDeleteItem} />
          </div>
        ))}
      </div>

      <button className="carousel-btn left" type="button" onClick={() => scrollByOneCard(-1)}>
        ‹
      </button>
      <button className="carousel-btn right" type="button" onClick={() => scrollByOneCard(1)}>
        ›
      </button>
    </div>
  );
}
