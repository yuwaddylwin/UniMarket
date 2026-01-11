import React, { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import ItemCard from "../ItemCardfromProfile";
import "./ItemCarousel.css";

export default function ItemCarousel({ items = [] }) {
  const scrollerRef = useRef(null);

  // ✅ keep local items so we can remove after delete
  const [localItems, setLocalItems] = useState(items);

  // keep localItems in sync when parent items change
  useEffect(() => {
    setLocalItems(items || []);
  }, [items]);

  const isCarousel = useMemo(() => (localItems?.length || 0) > 1, [localItems]);

  const scrollByOneCard = (dir = 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.round(el.clientWidth * 0.82) * dir;
    el.scrollBy({ left: amount, behavior: "smooth" });
  };

  const handleDeleteItem = async (id) => {
    try {
      const res = await fetch(`/api/items/${id}`, {
        method: "DELETE",
        credentials: "include", // ✅ IMPORTANT if you use cookies/session auth
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Delete failed");

      // ✅ update UI immediately
      setLocalItems((prev) => prev.filter((x) => (x._id || x.id) !== id));
      toast.success("Item deleted successfully");
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Delete failed");
      throw err;
    }
  };

  if (!localItems || localItems.length === 0) return null;

  // If only one item, render normally (no swipe UI)
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
          <div className="items-slide" key={it._id || it.id || it.title}>
            <ItemCard item={it} onDeleteItem={handleDeleteItem} />
          </div>
        ))}
      </div>

      {/* Optional arrows */}
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
