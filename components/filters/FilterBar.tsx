"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ButcherSummary, Specialty } from "@/lib/types";
import { useMapStore } from "@/store/useMapStore";
import { CleaverLogo } from "@/components/ui/CleaverLogo";

/** Score chips share the pin tier ramp (lib/scoreTier.ts) so the map key reads across both. */
const SCORES = [
  { min: 8, active: "bg-score-high border-score-high", dot: "bg-score-high" },
  { min: 7, active: "bg-score-mid border-score-mid", dot: "bg-score-mid" },
  { min: 6, active: "bg-score-low border-score-low", dot: "bg-score-low" },
] as const;

/** Map-overlay filter bar: brand lockup, search, chips. */
export function FilterBar({
  butchers,
  resultCount,
}: {
  butchers: ButcherSummary[];
  resultCount: number;
}) {
  const { filters, setFilter, resetFilters } = useMapStore();

  const specialties = useMemo(
    () => [...new Set(butchers.flatMap((b) => b.specialty))].sort() as Specialty[],
    [butchers],
  );

  const active =
    filters.minScore || filters.specialty || filters.openNow || filters.q;

  return (
    <div className="absolute top-3 left-3 right-3 z-10 sm:right-auto sm:w-[27rem]">
      <div className="rise-in rounded-2xl bg-surface/95 backdrop-blur-md shadow-xl border border-line overflow-hidden">
        {/* Brand strip */}
        <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
          <div className="flex items-center gap-2.5">
            <CleaverLogo size={48} className="text-oxblood shrink-0" />
            <div className="leading-none">
              <h1 className="font-display font-black text-xl tracking-tight text-oxblood">
                The Six Cut
              </h1>
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted mt-1">
                Toronto&apos;s independent butchers
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 pb-2 text-[10px] uppercase tracking-[0.14em] font-semibold whitespace-nowrap">
          <Link href="/about" className="text-muted hover:text-oxblood transition-colors">
            Why we built this
          </Link>
          <span aria-hidden className="text-line">·</span>
          <Link href="/methodology" className="text-muted hover:text-oxblood transition-colors">
            How we score
          </Link>
        </div>

        <div className="cut-line mx-4" />

        <div className="p-3 flex flex-col gap-2">
          <input
            type="search"
            placeholder="Search shops, streets, or specialties…"
            value={filters.q}
            onChange={(e) => setFilter("q", e.target.value)}
            className="w-full rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none
                       placeholder:text-muted focus:border-oxblood transition-colors"
            aria-label="Search by name, address, or specialty"
          />

          <div className="flex flex-wrap items-center gap-1.5 text-sm">
            <select
              value={filters.specialty ?? ""}
              onChange={(e) => setFilter("specialty", (e.target.value || null) as Specialty | null)}
              className="rounded-lg border border-line bg-background px-2 py-1.5 text-xs capitalize focus:border-oxblood outline-none"
              aria-label="Specialty"
            >
              <option value="">All specialties</option>
              {specialties.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>

            {SCORES.map(({ min, active, dot }) => (
              <button
                key={min}
                onClick={() => setFilter("minScore", filters.minScore === min ? null : min)}
                title={`Six Cut Score ${min} or higher`}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border transition-all ${
                  filters.minScore === min
                    ? `${active} text-oxblood-ink shadow-sm`
                    : "bg-background border-line hover:border-oxblood"
                }`}
              >
                <span
                  aria-hidden
                  className={`h-1.5 w-1.5 rounded-full ${
                    filters.minScore === min ? "bg-oxblood-ink/60" : dot
                  }`}
                />
                {min}+
              </button>
            ))}

            <button
              onClick={() => setFilter("openNow", !filters.openNow)}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold border transition-all ${
                filters.openNow
                  ? "bg-brass text-background border-brass shadow-sm"
                  : "bg-background border-line hover:border-brass"
              }`}
            >
              Open now
            </button>

            {active && (
              <button
                onClick={resetFilters}
                className="text-xs text-muted underline underline-offset-2 ml-auto hover:text-foreground"
              >
                Clear · {resultCount} shown
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
