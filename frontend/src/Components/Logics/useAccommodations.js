import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { axiosInstance } from "../lib/axios";

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
      images: Array.isArray(record.images)
        ? record.images.map((image) => (typeof image === "string" ? image : image?.url)).filter(Boolean)
        : [],
    })),
    [records]
  );

  return { accommodations, isLoading, error, refetch: fetchAccommodations };
}
