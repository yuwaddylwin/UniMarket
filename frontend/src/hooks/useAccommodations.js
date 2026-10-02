import { useMemo } from "react";
import { useListingRequest } from "./useListingRequest";
import { normalizeSeller as normalizeAccommodationSeller } from "../Components/common/listingSeller";

export { normalizeSeller as normalizeAccommodationSeller } from "../Components/common/listingSeller";

export function useAccommodations() {
  const {
    records,
    isLoading,
    error,
    refetch: fetchAccommodations,
  } = useListingRequest(
    "/accommodations",
    "accommodations",
    "Unable to load accommodation listings. Please try again.",
    "Fetch accommodations error:"
  );

  const accommodations = useMemo(
    () =>
      records.map((record) => ({
        ...record,
        title: record.title || record.name || "Untitled accommodation",
        location: record.location || "Location not provided",
        description: record.description || "",
        accommodationType: record.accommodationType || record.type || "",
        pricePeriod: record.pricePeriod || "month",
        seller: normalizeAccommodationSeller(record),
        images: Array.isArray(record.images)
          ? record.images
              .map((image) => (typeof image === "string" ? image : image?.url))
              .filter(Boolean)
          : [],
      })),
    [records]
  );

  return { accommodations, isLoading, error, refetch: fetchAccommodations };
}
