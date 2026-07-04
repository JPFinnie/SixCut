import Link from "next/link";
import { StarRating } from "@/components/ui/StarRating";

/**
 * The two scores, side by side: the Six Cut Score (/10, ours) and the
 * Google rating (theirs) — with a link to the published methodology.
 */
export function ScoreDuo({
  sixCutScore,
  googleRating,
  googleCount,
  compact = false,
}: {
  sixCutScore: number | null;
  googleRating: number | null;
  googleCount?: number | null;
  compact?: boolean;
}) {
  return (
    <div className={`flex items-center ${compact ? "gap-3" : "gap-4"}`}>
      <div className="flex items-baseline gap-1.5">
        <span
          className={`font-display font-black text-oxblood-strong leading-none ${
            compact ? "text-2xl" : "text-3xl"
          }`}
        >
          {sixCutScore != null ? sixCutScore.toFixed(1) : "—"}
        </span>
        <span className="text-muted text-sm">/10</span>
      </div>
      <div className="flex flex-col leading-tight">
        <Link
          href="/methodology"
          className="text-[9px] uppercase tracking-[0.18em] font-bold text-oxblood hover:underline underline-offset-2"
        >
          Six Cut Score ↗
        </Link>
        <StarRating
          rating={googleRating}
          count={googleCount}
          className="text-sm"
        />
      </div>
    </div>
  );
}
