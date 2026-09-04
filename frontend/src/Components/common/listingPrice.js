export function formatListingPrice(price, pricePeriod) {
  if (price === null || price === undefined || price === "") {
    return "Price on request";
  }

  const numericPrice = Number(price);
  if (!Number.isFinite(numericPrice)) return "Price on request";

  const formattedPrice = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(numericPrice);

  return `฿${formattedPrice}${pricePeriod ? ` / ${pricePeriod}` : ""}`;
}
