"use client";

import { useMemo } from "react";
import type { ButcherSummary, Specialty } from "@/lib/types";
import { useMapStore } from "@/store/useMapStore";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { CleaverLogo } from "@/components/ui/CleaverLogo";

const RATINGS = [4.5, 4, 3.5] as const;

/** Map-overlay filter bar: brand lockup, search, chips. */
export function FilterBar({
  butchers,
  resultCount,
}: {
  butchers: ButcherSummary[];
  resultCount: number;
}) {
  const { filters, setFilter, resetFilters } = useMapStore();

  const neighborhoods = useMemo(
    () =>
      [...new Set(butchers.map((b) => b.neighborhood).filter((n): n is string => !!n))].sort(),
    [butchers],
  );
  const specialties = useMemo(
    () => [...new Set(butchers.flatMap((b) => b.specialty))].sort() as Specialty[],
    [butchers],
  );

  const active =
    filters.neighborhood || filters.minRating || filters.specialty || filters.openNow || filters.q;

  return (
    <div className="absolute top-3 left-3 right-3 z-10 sm:right-auto sm:w-[27rem]">
      <div className="rise-in rounded-2xl bg-surface/95 backdrop-blur-md shadow-xl border border-line overflow-hidden">
        {/* Brand strip */}
        <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
          <div className="flex items-center gap-2.5">
            <CleaverLogo size={34} className="text-oxblood shrink-0" />
            <div className="leading-none">
              <h1 className="font-display font-black text-xl tracking-tight text-oxblood">
                The Six Cut
              </h1>
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted mt-1">
                Toronto&apos;s independent butchers
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <div className="cut-line mx-4" />

        <div className="p-3 flex flex-col gap-2">
          <input
            type="search"
            placeholder="Search shops or streets…"
            value={filters.q}
            onChange={(e) => setFilter("q", e.target.value)}
            className="w-full rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none
                       placeholder:text-muted focus:border-oxblood transition-colors"
            aria-label="Search by name or address"
          />

          <div className="flex flex-wrap items-center gap-1.5 text-sm">
            <select
              value={filters.neighborhood ?? ""}
              onChange={(e) => setFilter("neighborhood", e.target.value || null)}
              className="rounded-lg border border-line bg-background px-2 py-1.5 text-xs focus:border-oxblood outline-none"
              aria-label="Neighborhood"
            >
              <option value="">All neighborhoods</option>
              {neighborhoods.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>

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

            {RATINGS.map((r) => (
              <button
                key={r}
                onClick={() => setFilter("minRating", filters.minRating === r ? null : r)}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold border transition-all ${
                  filters.minRating === r
                    ? "bg-oxblood text-oxblood-ink border-oxblood shadow-sm"
                    : "bg-background border-line hover:border-oxblood"
                }`}
              >
                {r}★+
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
