import { useMemo } from "react";
import { useListingRequest } from "./useListingRequest";
import { normalizeSeller } from "../Components/common/listingSeller";

export { normalizeSeller } from "../Components/common/listingSeller";

export function useItemsList() {
  const {
    records: rawItems,
    isLoading,
    error,
    refetch: fetchItems,
  } = useListingRequest(
    "/items",
    "items",
    "Unable to load items. Please try again.",
    "Fetch items error:"
  );

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
