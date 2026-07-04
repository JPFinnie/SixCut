"use client";

import { useState } from "react";
import type { Media } from "@/lib/types";

/** Places photos are stored as resource names; resolve via our proxy route. */
const photoSrc = (m: Media, w = 1200) =>
  m.url.startsWith("places/")
    ? `/api/photo?name=${encodeURIComponent(m.url)}&w=${w}`
    : m.url;

/**
 * Interior viewer — MVP: photo gallery + optional Street View embed.
 * Splat-ready interface (PLAN.md §5): a 3D renderer drops in here later
 * without changing callers. Do not assume splats exist.
 */
export function InteriorViewer({
  media,
  butcherName,
}: {
  butcherId: string;
  media: Media[];
  butcherName: string;
}) {
  const photos = media.filter((m) => m.kind === "photo");
  const streetview = media.find((m) => m.kind === "streetview");
  const [idx, setIdx] = useState(0);
  const [tab, setTab] = useState<"photos" | "streetview">(
    photos.length > 0 ? "photos" : "streetview",
  );

  if (photos.length === 0 && !streetview) {
    return (
      <div className="rounded-2xl border border-dashed border-line p-10 text-center">
        <p className="font-display italic text-muted">Interior view coming soon.</p>
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted mt-1.5">
          Photos are on the block
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {photos.length > 0 && streetview && (
        <div className="flex gap-1.5">
          {(["photos", "streetview"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-3 py-1 text-xs font-semibold border transition-colors ${
                tab === t
                  ? "bg-oxblood text-oxblood-ink border-oxblood"
                  : "bg-surface border-line hover:border-oxblood"
              }`}
            >
              {t === "photos" ? "Photos" : "Street View"}
            </button>
          ))}
        </div>
      )}

      {tab === "photos" && photos.length > 0 && (
        <div className="relative rounded-2xl overflow-hidden border border-line bg-black/5">
          {/* eslint-disable-next-line @next/next/no-img-element -- external, uncurated hosts */}
          <img
            src={photoSrc(photos[idx])}
            alt={`Inside ${butcherName} (${idx + 1} of ${photos.length})`}
            className="w-full aspect-[4/3] object-cover"
            loading="lazy"
          />
          {photos.length > 1 && (
            <>
              <button
                aria-label="Previous photo"
                onClick={() => setIdx((idx - 1 + photos.length) % photos.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-surface/90 shadow grid place-items-center hover:bg-surface"
              >
                ‹
              </button>
              <button
                aria-label="Next photo"
                onClick={() => setIdx((idx + 1) % photos.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-surface/90 shadow grid place-items-center hover:bg-surface"
              >
                ›
              </button>
              <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1.5">
                {photos.map((p, i) => (
                  <button
                    key={p.id}
                    aria-label={`Photo ${i + 1}`}
                    onClick={() => setIdx(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === idx ? "w-5 bg-surface" : "w-1.5 bg-surface/60"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {tab === "streetview" && streetview && (
        <iframe
          src={streetview.url}
          title={`Street View of ${butcherName}`}
          className="w-full aspect-[4/3] rounded-2xl border border-line"
          allowFullScreen
          loading="lazy"
        />
      )}
    </div>
  );
}
