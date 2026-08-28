import { useEffect, useState } from "react";

export function getDescriptionPreview(value) {
  const description = String(value || "").trim();
  if (!description) {
    return { description: "", preview: "", shouldTruncate: false };
  }

  let sentences;
  if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "sentence" });
    sentences = Array.from(segmenter.segment(description), ({ segment }) => segment)
      .filter((sentence) => sentence.trim());
  } else {
    sentences = description.match(/.*?(?:[.!?]+["')\]]*(?=\s+|$)|$)/gs)
      ?.filter((sentence) => sentence.trim()) || [description];
  }

  return {
    description,
    preview: sentences.slice(0, 2).join("").trimEnd(),
    shouldTruncate: sentences.length > 2,
  };
}

export default function FeedDescription({ description: value, sellerName }) {
  const { description, preview, shouldTruncate } = getDescriptionPreview(value);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => setExpanded(false), [value]);

  if (!description) return null;

  return (
    <div className="listing-feed-description-shell">
      <p className="listing-feed-description">
        <strong>{sellerName}</strong>{" "}
        {shouldTruncate && !expanded ? preview : description}
        {shouldTruncate && (
          <button type="button" onClick={() => setExpanded((current) => !current)}>
            {expanded ? "...less" : "...more"}
          </button>
        )}
      </p>
    </div>
  );
}
