"use client";

import { useEffect, useMemo, useRef } from "react";
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import type { ButcherSummary } from "@/lib/types";
import { isOpenNow } from "@/lib/hours";
import { useMapStore } from "@/store/useMapStore";
import { ButcherPin } from "./ButcherPin";
import { ButcherCard } from "./ButcherCard";
import { FilterBar } from "@/components/filters/FilterBar";

const TORONTO = { longitude: -79.38, latitude: 43.68, zoom: 11.5 };
/** Below this zoom, pins render as compact score dots to avoid tag pile-ups. */
const TAG_ZOOM = 12.5;

export function MapExplorer({ butchers }: { butchers: ButcherSummary[] }) {
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
      <Map
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        initialViewState={TORONTO}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        style={{ position: "absolute", inset: 0 }}
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
      </Map>

      <FilterBar butchers={butchers} resultCount={visible.length} />

      {butchers.length === 0 && (
        <div className="absolute inset-0 z-10 grid place-items-center pointer-events-none">
          <div className="rise-in rounded-2xl bg-surface/95 border border-line shadow-xl px-8 py-6 text-center max-w-sm">
            <p className="font-display font-bold text-lg text-oxblood">The counter is empty</p>
            <p className="text-sm text-muted mt-1">
              No butchers loaded yet — run the seed script, then refresh.
            </p>
          </div>
        </div>
      )}

      {selected && <ButcherCard butcher={selected} onClose={() => select(null)} />}
    </div>
  );
}
