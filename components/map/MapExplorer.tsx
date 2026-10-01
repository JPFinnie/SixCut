"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import type { ButcherSummary } from "@/lib/types";
import { isOpenNow } from "@/lib/hours";
import { useMapStore } from "@/store/useMapStore";
import { ButcherPin } from "./ButcherPin";
import { ButcherCard } from "./ButcherCard";
import { MapLegend } from "./MapLegend";
import { FilterBar } from "@/components/filters/FilterBar";

const TORONTO = { longitude: -79.38, latitude: 43.68, zoom: 11.5 };
/** Below this zoom, pins render as compact score dots to avoid tag pile-ups. */
const TAG_ZOOM = 12.5;

export function MapExplorer({ butchers: initialButchers, unavailable = false }: {
  butchers: ButcherSummary[];
  unavailable?: boolean;
}) {
  const { data, error, mutate, isValidating } = useSWR<{ butchers: ButcherSummary[] }>(
    "/api/butchers", fetcher,
    {
      fallbackData: unavailable ? undefined : { butchers: initialButchers },
      revalidateOnMount: unavailable,
      refreshInterval: (latest) => latest ? 0 : 30_000,
    },
  );
  const butchers = data?.butchers ?? initialButchers;
  const directoryUnavailable = !data && (unavailable || Boolean(error));
  const [mapFailed, setMapFailed] = useState(false);
  const [listView, setListView] = useState(false);
  const showList = mapFailed || listView || !process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const { selectedId, filters, select } = useMapStore();

  // Compact-pin mode is toggled via a data attribute + CSS (see globals.css),
  // NOT React state: onMove fires every frame during a zoom gesture, and a
  // state flip there re-rendered all 124 markers mid-gesture (visible jank).
  const rootRef = useRef<HTMLDivElement>(null);
  const compactRef = useRef(TORONTO.zoom < TAG_ZOOM);
  useEffect(() => {
    rootRef.current?.setAttribute("data-compact", String(compactRef.current));
  }, []);
  const onMove = (zoom: number) => {
    const compact = zoom < TAG_ZOOM;
    if (compact !== compactRef.current) {
      compactRef.current = compact;
      rootRef.current?.setAttribute("data-compact", String(compact));
    }
  };

  const visible = useMemo(() => {
    // Underscores normalize to spaces so "custom cuts" matches "custom_cuts".
    const q = filters.q.trim().toLowerCase().replace(/_/g, " ");
    return butchers.filter((b) => {
      if (filters.minScore && (b.six_cut_score ?? 0) < filters.minScore) return false;
      if (filters.specialty && !b.specialty.includes(filters.specialty)) return false;
      if (filters.openNow && isOpenNow(b.hours) !== true) return false;
      if (q) {
        const haystack = `${b.name} ${b.address ?? ""} ${b.specialty.join(" ")}`
          .toLowerCase()
          .replace(/_/g, " ");
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [butchers, filters]);

  const selected = visible.find((b) => b.id === selectedId) ?? null;

  return (
    <div ref={rootRef} className="map-root relative flex-1 min-h-0">
      {!showList && <Map
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        initialViewState={TORONTO}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        style={{ position: "absolute", inset: 0 }}
        onError={() => setMapFailed(true)}
        onClick={() => select(null)}
        onMove={(e) => onMove(e.viewState.zoom)}
      >
        <NavigationControl position="bottom-right" showCompass={false} />
        {visible.map(
          (b) =>
            b.lat != null &&
            b.lng != null && (
              <Marker
                key={b.id}
                longitude={b.lng}
                latitude={b.lat}
                anchor="bottom"
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  select(b.id);
                }}
              >
                <ButcherPin
                  selected={b.id === selectedId}
                  score={b.six_cut_score}
                  name={b.name}
                />
              </Marker>
            ),
        )}
      </Map>}

      <FilterBar butchers={butchers} resultCount={visible.length} />
      {!showList && butchers.length > 0 && <MapLegend />}
      {butchers.length > 0 && !mapFailed && process.env.NEXT_PUBLIC_MAPBOX_TOKEN && (
        <button className="absolute bottom-5 left-3 z-10 rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold shadow-lg"
          onClick={() => setListView(!listView)}>
          {showList ? "Show map" : "Browse list"}
        </button>
      )}
      {showList && butchers.length > 0 && (
        <section aria-label="Butcher directory" className="absolute inset-x-3 top-72 bottom-20 overflow-y-auto rounded-2xl border border-line bg-surface p-4 sm:top-64 sm:max-w-2xl">
          <h2 className="font-display text-lg font-bold">{visible.length} shops found</h2>
          {mapFailed && <p className="text-sm text-muted mb-3" role="status">The map is unavailable in this browser. You can still browse every shop below.</p>}
          <ul className="divide-y divide-line">
            {visible.map((b) => (
              <li key={b.id} className="py-3">
                <Link className="font-semibold text-oxblood hover:underline" href={`/butcher/${b.slug}`}>{b.name}</Link>
                <p className="text-sm text-muted">{b.address ?? b.neighborhood}</p>
                <p className="text-xs mt-1">{b.six_cut_score == null ? "Six Cut score pending" : `Six Cut score ${b.six_cut_score.toFixed(1)}/10`}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(butchers.length === 0 || visible.length === 0) && (
        <div className="absolute inset-x-3 top-72 bottom-16 z-10 grid place-items-center pointer-events-none sm:top-64">
          <div className="pointer-events-auto rise-in rounded-2xl bg-surface/95 border border-line shadow-xl px-8 py-6 text-center max-w-sm" role="status">
            <p className="font-display font-bold text-lg text-oxblood">
              {directoryUnavailable ? "The directory is taking a break" : butchers.length ? "No matching shops" : "No shops published yet"}
            </p>
            <p className="text-sm text-muted mt-1">
              {directoryUnavailable ? "We couldn’t reach the shop directory. Please try again shortly." : butchers.length ? "Try a different search or clear your filters." : "Check back soon for Toronto’s independent butchers."}
            </p>
            {directoryUnavailable ? (
              <button disabled={isValidating} onClick={() => void mutate()} className="mt-3 rounded-full border border-line px-4 py-2 text-sm font-semibold disabled:opacity-50">
                {isValidating ? "Trying again…" : "Try again"}
              </button>
            ) : butchers.length > 0 ? (
              <button onClick={() => useMapStore.getState().resetFilters()} className="mt-3 text-sm underline">Clear filters</button>
            ) : null}
          </div>
        </div>
      )}

      {selected && <ButcherCard butcher={selected} onClose={() => select(null)} />}
    </div>
  );
}
