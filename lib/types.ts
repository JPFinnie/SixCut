export type Specialty =
  | "beef"
  | "pork"
  | "poultry"
  | "game"
  | "lamb"
  | "charcuterie"
  | "custom_cuts";

import type { ScoreBreakdown } from "@/lib/scoring";

export interface Butcher {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website: string | null;
  hours: OpeningHours | null;
  neighborhood: string | null;
  specialty: Specialty[];
  google_place_id: string | null;
  google_rating: number | null;
  google_review_count: number | null;
  six_cut_score: number | null;
  six_cut_breakdown: ScoreBreakdown | null;
  is_published: boolean;
}

/** Lean shape returned by GET /api/butchers for the map. */
export type ButcherSummary = Pick<
  Butcher,
  | "id"
  | "slug"
  | "name"
  | "address"
  | "lat"
  | "lng"
  | "neighborhood"
  | "specialty"
  | "google_rating"
  | "google_review_count"
  | "six_cut_score"
> & { hours: OpeningHours | null };

export interface Media {
  id: string;
  butcher_id: string;
  kind: "photo" | "streetview" | "splat";
  url: string;
  source: string | null;
  sort_order: number;
}

/** Stored from Places API regularOpeningHours. */
export interface OpeningHours {
  openNow?: boolean;
  weekdayDescriptions?: string[];
  periods?: Array<{
    open: { day: number; hour: number; minute: number };
    close?: { day: number; hour: number; minute: number };
  }>;
}

/** Live Google review — never persisted (PLAN.md §0.3). */
export interface Review {
  authorName: string;
  rating: number;
  text: string;
  relativeTime: string;
  profilePhotoUrl: string | null;
}
