"use client";

import { memo } from "react";
import { scoreTier } from "@/lib/scoreTier";

/**
 * Map pin as a hanging butcher's tag. Renders BOTH the compact score dot
 * (city zoom) and the full tag (zoomed in); CSS on the map root decides
 * which is visible (see globals.css "Zoom-adaptive pins"). The swap is a
 * display toggle — never an animated morph — and memo() keeps the 124
 * markers from re-rendering when unrelated state changes.
 *
 * Color encodes the score tier (data-tier → var(--tier) in globals.css);
 * the printed score keeps the tier readable without color.
 */
export const ButcherPin = memo(function ButcherPin({
  selected,
  score,
  name,
}: {
  selected: boolean;
  score: number | null;
  name: string;
}) {
  const label = `${name}${score != null ? `, Six Cut Score ${score.toFixed(1)} out of 10` : ""}`;
  const scoreText = score != null ? score.toFixed(1) : "—";

  return (
    <div
      role="button"
      aria-label={label}
      data-sel={selected}
      data-tier={scoreTier(score)}
      className={`pin group flex flex-col items-center cursor-pointer transition-transform duration-200 ease-out ${
        selected ? "scale-125 z-10" : "hover:scale-110"
      }`}
    >
      {/* compact: score dot (city zoom) */}
      <div className="pin-dot place-items-center h-6 w-6 rounded-full border-2 bg-surface border-(--tier) text-(--tier) shadow-md">
        <span className="font-display font-bold text-[9px] leading-none">{scoreText}</span>
      </div>

      {/* full: hanging tag (zoomed in, or selected) */}
      <div
        className={`pin-tag relative flex flex-col items-center rounded-md border-2 px-2.5 pb-1 pt-1.5 shadow-md max-w-[8.5rem]
          ${selected
            ? "rotate-0 bg-(--tier) border-(--tier) text-oxblood-ink shadow-lg"
            : "-rotate-3 bg-surface border-(--tier) text-(--tier) group-hover:-rotate-1"
          }`}
      >
        <span
          className={`absolute -top-[5px] h-2 w-2 rounded-full border-2 border-(--tier) ${
            selected ? "bg-oxblood-ink" : "bg-background"
          }`}
        />
        <span className="font-display font-bold text-sm leading-none tracking-tight">
          {scoreText}
        </span>
        <span className="w-full text-center text-[8px] font-semibold uppercase tracking-[0.08em] leading-tight truncate opacity-90">
          {name}
        </span>
      </div>

      {/* pointer stem (hides with the tag) */}
      <div className={`pin-tag h-2 w-0.5 ${selected ? "bg-(--tier)" : "bg-(--tier)/70"}`} />
    </div>
  );
});
