import { useCallback, useEffect, useRef, useState } from "react";
import { axiosInstance } from "../lib/axios";

// Only the newest request may update state; abort on refetch and unmount.
export function useListingRequest(
  endpoint,
  responseKey,
  errorMessage,
  logMessage
) {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const requestRef = useRef({ id: 0, controller: null });

  const refetch = useCallback(async () => {
    requestRef.current.controller?.abort();

    const requestId = requestRef.current.id + 1;
    const controller = new AbortController();
    requestRef.current = { id: requestId, controller };

    try {
      setIsLoading(true);
      setError("");

      const res = await axiosInstance.get(endpoint, {
        signal: controller.signal,
      });

      const list = Array.isArray(res.data)
        ? res.data
        : res.data?.[responseKey] || [];
      if (requestRef.current.id === requestId) {
        setRecords(list);
      }
    } catch (err) {
      if (controller.signal.aborted) return;

      console.error(logMessage, err);
      if (requestRef.current.id === requestId) {
        setError(err?.response?.data?.message || errorMessage);
      }
    } finally {
      if (requestRef.current.id === requestId) {
        setIsLoading(false);
      }
    }
  }, [endpoint, responseKey, errorMessage, logMessage]);

  useEffect(() => {
    refetch();

    return () => {
      requestRef.current.controller?.abort();
      requestRef.current.id += 1;
    };
  }, [refetch]);

  return { records, isLoading, error, refetch };
}
