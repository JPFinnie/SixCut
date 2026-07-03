"use client";

import Link from "next/link";
import useSWR from "swr";
import type { ButcherSummary, Review } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";
import { isOpenNow, todayHoursLine } from "@/lib/hours";
import { StarRating } from "@/components/ui/StarRating";

/** Slide-out detail card for the selected butcher (PLAN.md §7). */
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
      className="absolute z-20 bg-background shadow-2xl border border-parchment overflow-y-auto
                 inset-x-0 bottom-0 max-h-[55%] rounded-t-2xl
                 sm:inset-x-auto sm:right-4 sm:top-4 sm:bottom-4 sm:max-h-none sm:w-96 sm:rounded-xl"
      aria-label={`Details for ${butcher.name}`}
    >
      <div className="p-5 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-xl font-bold leading-tight">{butcher.name}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full h-8 w-8 grid place-items-center text-ink-soft hover:bg-parchment"
          >
            ✕
          </button>
        </div>

        <StarRating rating={butcher.google_rating} count={butcher.google_review_count} />

        <div className="text-sm text-ink-soft flex flex-col gap-1">
          {butcher.address && <p>{butcher.address}</p>}
          {today && <p>{today}</p>}
          {open != null && (
            <p className={open ? "text-green-700 font-medium" : "text-oxblood font-medium"}>
              {open ? "Open now" : "Closed now"}
            </p>
          )}
        </div>

        {butcher.specialty.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {butcher.specialty.map((s) => (
              <span
                key={s}
                className="rounded-full bg-parchment px-2.5 py-0.5 text-xs font-medium capitalize"
              >
                {s.replace("_", " ")}
              </span>
            ))}
          </div>
        )}

        <div className="border-t border-parchment pt-3">
          <h3 className="text-sm font-semibold mb-2">Recent reviews</h3>
          {reviews === null ? (
            <p className="text-sm text-ink-soft animate-pulse">Loading reviews…</p>
          ) : reviews.length === 0 ? (
            <p className="text-sm text-ink-soft">No reviews available.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {reviews.slice(0, 3).map((r, i) => (
                <li key={i} className="text-sm">
                  <span className="text-amber-600">{"★".repeat(Math.round(r.rating))}</span>{" "}
                  <span className="text-ink-soft">· {r.authorName}</span>
                  <p className="line-clamp-3 mt-0.5">{r.text}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Link
          href={`/butcher/${butcher.slug}`}
          className="mt-1 block rounded-lg bg-oxblood px-4 py-2.5 text-center font-semibold text-parchment hover:bg-oxblood-dark transition-colors"
        >
          View Interior →
        </Link>
      </div>
    </aside>
  );
}
