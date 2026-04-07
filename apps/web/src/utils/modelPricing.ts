export function formatPricePerMillion(price: number) {
  if (!Number.isFinite(price) || price <= 0) return "$0/1M";
  if (price >= 100) return `$${Math.round(price)}/1M`;
  if (price >= 10) return `$${price.toFixed(1).replace(/\.0$/, "")}/1M`;
  if (price >= 1) return `$${price.toFixed(2).replace(/\.?0+$/, "")}/1M`;
  if (price >= 0.01) return `$${price.toFixed(3).replace(/\.?0+$/, "")}/1M`;
  return `$${price.toFixed(4).replace(/\.?0+$/, "")}/1M`;
}
