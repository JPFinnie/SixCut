/**
 * Display tiers for the Six Cut Score. One sequential ramp — hotter and
 * brighter means a higher score — plus a neutral for shops below 6 or not
 * yet scored. Pins, filter chips, and the map key all read from this so
 * the encoding can't drift between them. Hexes live in globals.css
 * (--score-high/-mid/-low/-none), validated ≥3:1 against --surface.
 */
export type ScoreTier = "high" | "mid" | "low" | "none";

export function scoreTier(score: number | null): ScoreTier {
  if (score == null || score < 6) return "none";
  if (score >= 8) return "high";
  if (score >= 7) return "mid";
  return "low";
}

/** Legend rows, highest first. `swatch` is a Tailwind bg-* utility. */
export const SCORE_TIER_KEY: { tier: ScoreTier; label: string; swatch: string }[] = [
  { tier: "high", label: "8+", swatch: "bg-score-high" },
  { tier: "mid", label: "7–7.9", swatch: "bg-score-mid" },
  { tier: "low", label: "6–6.9", swatch: "bg-score-low" },
  { tier: "none", label: "Under 6 · unrated", swatch: "bg-score-none" },
];
