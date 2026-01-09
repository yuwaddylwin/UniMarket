import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

function normalizeSeller(it) {
  // If backend sends seller snapshot
  if (it?.seller && typeof it.seller === "object") {
    return {
      id: it.seller.id || it.seller._id || it.seller.userId || null,
      fullName: it.seller.fullName || it.seller.name || it.seller.username || "",
      profilePic: it.seller.profilePic || it.seller.avatar || "",
    };
  }

  // If backend populates user
  if (it?.user && typeof it.user === "object") {
    return {
      id: it.user._id || it.user.id || null,
      fullName:
        it.user.fullName ||
        it.user.name ||
        it.user.username ||
        it.user.email ||
        "",
      profilePic: it.user.profilePic || it.user.avatar || it.user.photo || "",
    };
  }

  // If backend sends user as id string
  if (typeof it?.user === "string") {
    return { id: it.user, fullName: "", profilePic: "" };
  }

  return null;
}

export function useItemsList() {
  const [rawItems, setRawItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const mountedRef = useRef(true);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await axios.get("http://localhost:8000/api/items", {
        withCredentials: true,
      });

      const list = Array.isArray(res.data) ? res.data : res.data?.items || [];
      if (mountedRef.current) setRawItems(list);
    } catch (err) {
      console.error("Fetch items error:", err);
      if (mountedRef.current)
        setError(err?.response?.data?.message || err.message || "Fetch failed");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchItems();

    return () => {
      mountedRef.current = false;
    };
  }, [fetchItems]);

  const items = useMemo(() => {
    return rawItems.map((it) => {
      const images = Array.isArray(it.images)
        ? it.images
            .map((img) => (typeof img === "string" ? img : img?.url))
            .filter(Boolean)
        : it.image
        ? [it.image]
        : [];

      const seller = normalizeSeller(it);

      return {
        ...it,
        title: it.title || it.name || "Untitled",
        description: it.description || "",
        price: it.price ?? 0,
        images,
        seller, // always normalized object or null
      };
    });
  }, [rawItems]);

  return { items, loading, error, refetch: fetchItems };
}
