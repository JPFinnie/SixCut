"use client";

import { useMemo } from "react";
import type { ButcherSummary, Specialty } from "@/lib/types";
import { useMapStore } from "@/store/useMapStore";

const RATINGS = [4.5, 4, 3.5] as const;

/** Map-overlay filter bar: neighborhood, rating, specialty, open-now, search. */
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
    <div className="absolute top-3 left-3 right-3 z-10 sm:right-auto sm:w-[26rem] flex flex-col gap-2">
      <div className="rounded-xl bg-background/95 backdrop-blur shadow-lg border border-parchment p-3 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h1 className="font-bold text-oxblood whitespace-nowrap">The Six Cut</h1>
          <input
            type="search"
            placeholder="Search butchers…"
            value={filters.q}
            onChange={(e) => setFilter("q", e.target.value)}
            className="w-full rounded-lg border border-parchment bg-white px-3 py-1.5 text-sm outline-none focus:border-oxblood"
            aria-label="Search by name or address"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          <select
            value={filters.neighborhood ?? ""}
            onChange={(e) => setFilter("neighborhood", e.target.value || null)}
            className="rounded-lg border border-parchment bg-white px-2 py-1 text-xs"
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
            className="rounded-lg border border-parchment bg-white px-2 py-1 text-xs capitalize"
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
              className={`rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${
                filters.minRating === r
                  ? "bg-oxblood text-parchment border-oxblood"
                  : "bg-white border-parchment hover:border-oxblood"
              }`}
            >
              {r}★+
            </button>
          ))}

          <button
            onClick={() => setFilter("openNow", !filters.openNow)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${
              filters.openNow
                ? "bg-green-700 text-white border-green-700"
                : "bg-white border-parchment hover:border-green-700"
            }`}
          >
            Open now
          </button>

          {active && (
            <button
              onClick={resetFilters}
              className="text-xs text-ink-soft underline underline-offset-2 ml-auto"
            >
              Clear · {resultCount} shown
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
