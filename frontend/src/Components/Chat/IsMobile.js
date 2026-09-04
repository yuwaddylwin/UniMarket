import { useEffect, useState } from "react";

const MOBILE_QUERY = "(max-width: 768px), (max-width: 932px) and (max-height: 500px) and (pointer: coarse)";

export const useIsMobile = () => {
  const getMatches = () => window.matchMedia
    ? window.matchMedia(MOBILE_QUERY).matches
    : window.innerWidth <= 768;
  const [isMobile, setIsMobile] = useState(getMatches);

  useEffect(() => {
    if (!window.matchMedia) {
      const onResize = () => setIsMobile(window.innerWidth <= 768);
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }
    const media = window.matchMedia(MOBILE_QUERY);
    const onChange = (event) => setIsMobile(event.matches);
    media.addEventListener?.("change", onChange);
    return () => media.removeEventListener?.("change", onChange);
  }, []);

  return isMobile;
};
