/** Compact star rating: ★★★★½ 4.6 (312) */
export function StarRating({
  rating,
  count,
  className = "",
}: {
  rating: number | null;
  count?: number | null;
  className?: string;
}) {
  if (rating == null) {
    return <span className={`text-ink-soft text-sm ${className}`}>No rating yet</span>;
  }
  const full = Math.floor(rating);
  const half = rating - full >= 0.25 && rating - full < 0.75;
  const stars =
    "★".repeat(full + (rating - full >= 0.75 ? 1 : 0)) + (half ? "½" : "");
  return (
    <span className={`inline-flex items-baseline gap-1.5 ${className}`}>
      <span aria-hidden className="text-amber-600 tracking-tight">{stars}</span>
      <span className="font-semibold">{rating.toFixed(1)}</span>
      {count != null && (
        <span className="text-ink-soft text-sm">({count.toLocaleString()})</span>
      )}
      <span className="sr-only">{rating.toFixed(1)} out of 5 stars</span>
    </span>
  );
}
