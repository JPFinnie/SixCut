"use client";

import { useMemo } from "react";
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import type { ButcherSummary } from "@/lib/types";
import { isOpenNow } from "@/lib/hours";
import { useMapStore } from "@/store/useMapStore";
import { useTheme } from "@/lib/theme";
import { ButcherPin } from "./ButcherPin";
import { ButcherCard } from "./ButcherCard";
import { FilterBar } from "@/components/filters/FilterBar";

const TORONTO = { longitude: -79.38, latitude: 43.68, zoom: 11.5 };
const STYLES = {
  light: "mapbox://styles/mapbox/light-v11",
  dark: "mapbox://styles/mapbox/dark-v11",
} as const;

export function MapExplorer({ butchers }: { butchers: ButcherSummary[] }) {
  const { selectedId, filters, select } = useMapStore();
  const { theme } = useTheme();

  const visible = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return butchers.filter((b) => {
      if (filters.neighborhood && b.neighborhood !== filters.neighborhood) return false;
      if (filters.minRating && (b.google_rating ?? 0) < filters.minRating) return false;
      if (filters.specialty && !b.specialty.includes(filters.specialty)) return false;
      if (filters.openNow && isOpenNow(b.hours) !== true) return false;
      if (q && !`${b.name} ${b.address ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [butchers, filters]);

  const selected = visible.find((b) => b.id === selectedId) ?? null;

  return (
    <div className="relative flex-1 min-h-0">
      <Map
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        initialViewState={TORONTO}
        mapStyle={STYLES[theme]}
        style={{ position: "absolute", inset: 0 }}
        onClick={() => select(null)}
      >
        <NavigationControl position="bottom-right" />
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
                  rating={b.google_rating}
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
