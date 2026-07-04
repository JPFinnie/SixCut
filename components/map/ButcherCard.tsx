"use client";

import Link from "next/link";
import useSWR from "swr";
import type { ButcherSummary, Review } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";
import { isOpenNow, todayHoursLine } from "@/lib/hours";
import { ScoreDuo } from "@/components/ui/ScoreDuo";

/** Slide-out ledger card for the selected butcher. */
export function ButcherCard({
  butcher,
  onClose,
}: {
  butcher: ButcherSummary;
  onClose: () => void;
}) {
  const { data, error } = useSWR<{ reviews: Review[] }>(
    `/api/butchers/${butcher.id}/reviews`,
    fetcher,
    { revalidateOnFocus: false },
  );
  const reviews = error ? [] : (data?.reviews ?? null);

  const open = isOpenNow(butcher.hours);
  const today = todayHoursLine(butcher.hours);

  return (
    <aside
      className="card-in themed-scroll absolute z-20 bg-surface shadow-2xl border border-line overflow-y-auto
                 inset-x-0 bottom-0 max-h-[58%] rounded-t-2xl
                 sm:inset-x-auto sm:right-4 sm:top-4 sm:bottom-4 sm:max-h-none sm:w-[24rem] sm:rounded-2xl"
      aria-label={`Details for ${butcher.name}`}
    >
      <div className="p-5 flex flex-col gap-3.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            {butcher.neighborhood && (
              <p className="text-[10px] uppercase tracking-[0.22em] text-oxblood font-semibold mb-1">
                {butcher.neighborhood}
              </p>
            )}
            <h2 className="font-display font-black text-2xl leading-[1.05] tracking-tight">
              {butcher.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full h-8 w-8 grid place-items-center text-muted border border-transparent
                       hover:border-line hover:text-foreground transition-colors"
          >
            ✕
          </button>
        </div>

        <ScoreDuo
          sixCutScore={butcher.six_cut_score}
          googleRating={butcher.google_rating}
          googleCount={butcher.google_review_count}
          compact
        />

        <div className="text-sm text-muted flex flex-col gap-1">
          {butcher.address && <p>{butcher.address}</p>}
          {today && <p>{today}</p>}
          {open != null && (
            <p className={`font-semibold ${open ? "text-brass" : "text-oxblood"}`}>
              {open ? "● Open now" : "○ Closed now"}
            </p>
          )}
        </div>

        {butcher.specialty.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {butcher.specialty.map((s) => (
              <span
                key={s}
                className="rounded-full border border-dashed border-line px-2.5 py-0.5 text-xs font-medium capitalize text-muted"
              >
                {s.replace("_", " ")}
              </span>
            ))}
          </div>
        )}

        <div className="cut-line pt-3">
          <h3 className="text-[10px] uppercase tracking-[0.22em] text-muted font-semibold mb-2.5">
            From the reviews
          </h3>
          {reviews === null ? (
            <p className="text-sm text-muted animate-pulse">Loading reviews…</p>
          ) : reviews.length === 0 ? (
            <p className="text-sm text-muted">No reviews available.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {reviews.slice(0, 3).map((r, i) => (
                <li key={i} className="text-sm">
                  <p className="font-display italic leading-snug line-clamp-3">
                    “{r.text}”
                  </p>
                  <p className="text-xs text-muted mt-1">
                    <span className="text-brass">{"★".repeat(Math.round(r.rating))}</span>{" "}
                    — {r.authorName}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Link
          href={`/butcher/${butcher.slug}`}
          className="mt-1 block rounded-xl bg-oxblood px-4 py-3 text-center font-display font-bold text-oxblood-ink
                     hover:bg-oxblood-strong hover:-translate-y-0.5 transition-all shadow-md"
        >
          Step Inside →
        </Link>
      </div>
    </aside>
  );
}
