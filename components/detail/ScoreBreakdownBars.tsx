import type { ScoreBreakdown } from "@/lib/scoring";
import { WEIGHTS } from "@/lib/scoring";

const LABELS: Array<[keyof typeof WEIGHTS, string]> = [
  ["quality", "Meat quality"],
  ["service", "Service"],
  ["craft", "Butchercraft"],
  ["rating", "Rating base"],
  ["volume", "Review volume"],
];

/** The five components behind this shop's Six Cut Score, as compact bars. */
export function ScoreBreakdownBars({ breakdown }: { breakdown: ScoreBreakdown }) {
  return (
    <div className="rounded-xl border border-dashed border-line p-3.5 max-w-md">
      <div className="flex flex-col gap-1.5">
        {LABELS.map(([key, label]) => (
          <div key={key} className="flex items-center gap-2 text-xs">
            <span className="w-28 shrink-0 text-muted">{label}</span>
            <span className="flex-1 h-1.5 rounded-full bg-line/60 overflow-hidden">
              <span
                className="block h-full rounded-full bg-oxblood"
                style={{ width: `${Math.round(breakdown[key] * 100)}%` }}
              />
            </span>
            <span className="w-8 text-right text-muted tabular-nums">
              {(breakdown[key] * 10).toFixed(1)}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted mt-2.5">
        Weighted {Object.values(WEIGHTS).map((w) => `${w * 100}%`).join(" / ")} ·{" "}
        {breakdown.reviewsAnalyzed} recent reviews analyzed
        {breakdown.archivedReviews
          ? ` (${breakdown.archivedReviews} via our 30-day signal archive)`
          : ""}{" "}
        · refreshed monthly
      </p>
    </div>
  );
}
