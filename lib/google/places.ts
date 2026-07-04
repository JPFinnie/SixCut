/**
 * Google Places API (New) helpers — server only.
 * Docs: https://developers.google.com/maps/documentation/places/web-service/op-overview
 */
import type { OpeningHours, Review } from "@/lib/types";

const BASE = "https://places.googleapis.com/v1";

function apiKey(): string {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error("GOOGLE_MAPS_API_KEY is not set");
  return key;
}

export interface PlaceDetails {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  nationalPhoneNumber?: string;
  websiteUri?: string;
  regularOpeningHours?: OpeningHours;
  rating?: number;
  userRatingCount?: number;
  reviews?: Array<{
    rating: number;
    text?: { text: string };
    relativePublishTimeDescription?: string;
    authorAttribution?: { displayName?: string; photoUri?: string };
  }>;
  photos?: Array<{ name: string; widthPx?: number; heightPx?: number }>;
}

/** Resolve a place by free-text query (e.g. "Sanagan's Meat Locker Toronto"). */
export async function searchPlace(query: string): Promise<{ id: string; formattedAddress?: string } | null> {
  const res = await fetch(`${BASE}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey(),
      "X-Goog-FieldMask": "places.id,places.formattedAddress,places.displayName",
    },
    body: JSON.stringify({ textQuery: query, regionCode: "CA" }),
  });
  if (!res.ok) throw new Error(`searchText ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { places?: Array<{ id: string; formattedAddress?: string }> };
  return data.places?.[0] ?? null;
}

const DETAILS_FIELDS = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "nationalPhoneNumber",
  "websiteUri",
  "regularOpeningHours",
  "rating",
  "userRatingCount",
].join(",");

export async function getPlaceDetails(
  placeId: string,
  opts: { withReviews?: boolean; withPhotos?: boolean } = {},
): Promise<PlaceDetails> {
  let fields = DETAILS_FIELDS;
  if (opts.withReviews) fields += ",reviews";
  if (opts.withPhotos) fields += ",photos";
  const res = await fetch(`${BASE}/places/${placeId}`, {
    headers: { "X-Goog-Api-Key": apiKey(), "X-Goog-FieldMask": fields },
  });
  if (!res.ok) throw new Error(`placeDetails ${res.status}: ${await res.text()}`);
  return (await res.json()) as PlaceDetails;
}

/**
 * Resolve a photo resource name ("places/{id}/photos/{ref}") to a short-lived
 * googleusercontent URI. Server-only — the API key never reaches the client.
 */
export async function getPhotoUri(
  photoName: string,
  maxWidthPx = 1200,
): Promise<string | null> {
  const res = await fetch(
    `${BASE}/${photoName}/media?maxWidthPx=${maxWidthPx}&skipHttpRedirect=true`,
    { headers: { "X-Goog-Api-Key": apiKey() } },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { photoUri?: string };
  return data.photoUri ?? null;
}

/** Map raw Places reviews to our live (never persisted) Review shape. */
export function toReviews(details: PlaceDetails): Review[] {
  return (details.reviews ?? []).map((r) => ({
    authorName: r.authorAttribution?.displayName ?? "Google user",
    rating: r.rating,
    text: r.text?.text ?? "",
    relativeTime: r.relativePublishTimeDescription ?? "",
    profilePhotoUrl: r.authorAttribution?.photoUri ?? null,
  }));
}
