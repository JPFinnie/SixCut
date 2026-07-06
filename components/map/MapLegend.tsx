import { SCORE_TIER_KEY } from "@/lib/scoreTier";

/** Map-overlay key for the score-tier pin colors. */
export function MapLegend() {
  return (
    <div className="absolute bottom-9 left-3 z-10 rise-in rounded-xl bg-surface/95 backdrop-blur-md border border-line shadow-lg px-3 py-2">
      <p className="text-[9px] uppercase tracking-[0.18em] font-semibold text-muted">
        Six Cut Score
      </p>
      <ul className="mt-1.5 flex flex-col gap-1">
        {SCORE_TIER_KEY.map(({ tier, label, swatch }) => (
          <li key={tier} className="flex items-center gap-2 text-[11px] leading-none text-foreground">
            <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${swatch}`} />
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
