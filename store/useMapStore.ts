import { create } from "zustand";
import type { Specialty } from "@/lib/types";

export interface Filters {
  neighborhood: string | null;
  minRating: number | null; // 4.5 | 4 | 3.5
  specialty: Specialty | null;
  openNow: boolean;
  q: string;
}

export const EMPTY_FILTERS: Filters = {
  neighborhood: null,
  minRating: null,
  specialty: null,
  openNow: false,
  q: "",
};

interface MapState {
  selectedId: string | null;
  filters: Filters;
  select: (id: string | null) => void;
  setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  resetFilters: () => void;
}

export const useMapStore = create<MapState>((set) => ({
  selectedId: null,
  filters: EMPTY_FILTERS,
  select: (id) => set({ selectedId: id }),
  setFilter: (key, value) =>
    set((s) => ({ filters: { ...s.filters, [key]: value } })),
  resetFilters: () => set({ filters: EMPTY_FILTERS }),
}));
