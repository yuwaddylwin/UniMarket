import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { axiosInstance } from "../lib/axios";

export function normalizeAccommodationSeller(record) {
  if (record?.user && typeof record.user === "object") {
    return {
      id: record.user._id || record.user.id || null,
      fullName:
        record.user.fullName ||
        record.user.name ||
        record.user.username ||
        record.user.email ||
        "",
      profilePic:
        record.user.profilePic || record.user.avatar || record.user.photo || "",
    };
  }
  if (record?.seller && typeof record.seller === "object") {
    return {
      id: record.seller.id || record.seller._id || record.seller.userId || null,
      fullName:
        record.seller.fullName || record.seller.name || record.seller.username || "",
      profilePic: record.seller.profilePic || record.seller.avatar || "",
    };
  }
  if (typeof record?.user === "string") {
    return { id: record.user, fullName: "", profilePic: "" };
  }
  return null;
}

export function useAccommodations() {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const requestRef = useRef({ id: 0, controller: null });

  const fetchAccommodations = useCallback(async () => {
    requestRef.current.controller?.abort();
    const requestId = requestRef.current.id + 1;
    const controller = new AbortController();
    requestRef.current = { id: requestId, controller };

    try {
      setIsLoading(true);
      setError("");
      const response = await axiosInstance.get("/accommodations", { signal: controller.signal });
      const list = Array.isArray(response.data) ? response.data : response.data?.accommodations || [];
      if (requestRef.current.id === requestId) setRecords(list);
    } catch (requestError) {
      if (controller.signal.aborted) return;
      console.error("Fetch accommodations error:", requestError);
      if (requestRef.current.id === requestId) {
        setError(requestError?.response?.data?.message || "Unable to load accommodation listings. Please try again.");
      }
    } finally {
      if (requestRef.current.id === requestId) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccommodations();
    return () => {
      requestRef.current.controller?.abort();
      requestRef.current.id += 1;
    };
  }, [fetchAccommodations]);

  const accommodations = useMemo(
    () => records.map((record) => ({
      ...record,
      title: record.title || record.name || "Untitled accommodation",
      location: record.location || "Location not provided",
      description: record.description || "",
      accommodationType: record.accommodationType || record.type || "",
      pricePeriod: record.pricePeriod || "month",
      seller: normalizeAccommodationSeller(record),
      images: Array.isArray(record.images)
        ? record.images.map((image) => (typeof image === "string" ? image : image?.url)).filter(Boolean)
        : [],
    })),
    [records]
  );

  return { accommodations, isLoading, error, refetch: fetchAccommodations };
}
