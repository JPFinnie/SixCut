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
    return <p className="text-sm text-ink-soft animate-pulse">Loading reviews…</p>;

  const reviews = data?.reviews ?? [];
  if (reviews.length === 0)
    return <p className="text-sm text-ink-soft">No reviews available.</p>;

  return (
    <ul className="flex flex-col gap-4">
      {reviews.map((r, i) => (
        <li key={i} className="rounded-xl border border-parchment bg-white p-4">
          <div className="flex items-center gap-2 mb-1.5">
            {r.profilePhotoUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- Google-hosted avatar
              <img
                src={r.profilePhotoUrl}
                alt=""
                className="h-7 w-7 rounded-full"
                loading="lazy"
              />
            )}
            <span className="font-medium text-sm">{r.authorName}</span>
            <span className="text-amber-600 text-sm">{"★".repeat(Math.round(r.rating))}</span>
            <span className="text-xs text-ink-soft ml-auto">{r.relativeTime}</span>
          </div>
          <p className="text-sm leading-relaxed">{r.text}</p>
        </li>
      ))}
      <li className="text-xs text-ink-soft">Reviews from Google.</li>
    </ul>
  );
}
