"use client";

import useSWR from "swr";
import type { Review } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";

/** Full live review list (≤5 from Google, never persisted). */
export function ReviewList({ butcherId }: { butcherId: string }) {
  const { data, error } = useSWR<{ reviews: Review[] }>(
    `/api/butchers/${butcherId}/reviews`,
    fetcher,
    { revalidateOnFocus: false },
  );

  if (!data && !error)
    return <p className="text-sm text-muted animate-pulse">Loading reviews…</p>;

  const reviews = data?.reviews ?? [];
  if (reviews.length === 0)
    return <p className="text-sm text-muted">No reviews available.</p>;

  return (
    <ul className="flex flex-col gap-3">
      {reviews.map((r, i) => (
        <li
          key={i}
          className="rounded-2xl border border-line bg-surface p-5 relative overflow-hidden"
        >
          <span
            aria-hidden
            className="absolute -top-3 left-3 font-display font-black text-6xl text-oxblood/10 select-none"
          >
            “
          </span>
          <p className="font-display italic leading-relaxed relative">{r.text}</p>
          <div className="flex items-center gap-2 mt-3">
            {r.profilePhotoUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- Google-hosted avatar
              <img
                src={r.profilePhotoUrl}
                alt=""
                className="h-6 w-6 rounded-full"
                loading="lazy"
              />
            )}
            <span className="text-sm font-semibold">{r.authorName}</span>
            <span className="text-brass text-sm">{"★".repeat(Math.round(r.rating))}</span>
            <span className="text-xs text-muted ml-auto">{r.relativeTime}</span>
          </div>
        </li>
      ))}
      <li className="text-[10px] uppercase tracking-[0.18em] text-muted text-center">
        Reviews from Google
      </li>
    </ul>
  );
}
