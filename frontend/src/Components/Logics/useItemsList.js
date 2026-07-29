import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { axiosInstance } from "../lib/axios";

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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const requestRef = useRef({ id: 0, controller: null });

  const fetchItems = useCallback(async () => {
    requestRef.current.controller?.abort();

    const requestId = requestRef.current.id + 1;
    const controller = new AbortController();
    requestRef.current = { id: requestId, controller };

    try {
      setIsLoading(true);
      setError("");

      const res = await axiosInstance.get("/items", {
        signal: controller.signal,
      });

      const list = Array.isArray(res.data) ? res.data : res.data?.items || [];
      if (requestRef.current.id === requestId) {
        setRawItems(list);
      }
    } catch (err) {
      if (controller.signal.aborted) return;

      console.error("Fetch items error:", err);
      if (requestRef.current.id === requestId) {
        setError(
          err?.response?.data?.message ||
            "Unable to load items. Please try again."
        );
      }
    } finally {
      if (requestRef.current.id === requestId) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchItems();

    return () => {
      requestRef.current.controller?.abort();
      requestRef.current.id += 1;
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

  return {
    items,
    isLoading,
    loading: isLoading,
    error,
    refetch: fetchItems,
  };
}
