/**
 * Seed script — resolves each candidate butcher via Google Places API (New),
 * pulls details, and upserts into Supabase `butchers` (conflict on google_place_id).
 *
 * Run:  pnpm seed          (uses .env.local via dotenv)
 *
 * Re-runnable: safe to run again to refresh ratings/hours.
 * Review TEXT is never stored (PLAN.md §0.3) — only aggregate rating/count.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { searchPlace, getPlaceDetails } from "../lib/google/places";
import type { Specialty } from "../lib/types";

interface Candidate {
  query: string;            // Places text query
  slug: string;
  neighborhood: string;     // manual (plan §4.3)
  specialty: Specialty[];   // manual (plan §4.3)
}

// Candidate list from PLAN.md §4 — each is verified live via Places before
// publishing. Exclude anything Places can't resolve (likely closed).
const CANDIDATES: Candidate[] = [
  { query: "Sanagan's Meat Locker Kensington Toronto", slug: "sanagans-meat-locker", neighborhood: "Kensington Market", specialty: ["beef", "pork", "poultry", "custom_cuts"] },
  { query: "Cumbrae's Church Street Toronto", slug: "cumbraes", neighborhood: "Church-Wellesley", specialty: ["beef", "lamb", "charcuterie"] },
  { query: "The Healthy Butcher Queen West Toronto", slug: "the-healthy-butcher", neighborhood: "Trinity Bellwoods", specialty: ["beef", "poultry", "custom_cuts"] },
  { query: "Rowe Farms Leslieville Toronto", slug: "rowe-farms-leslieville", neighborhood: "Leslieville", specialty: ["beef", "poultry", "pork"] },
  { query: "Olliffe Butcher Shop Summerhill Toronto", slug: "olliffe", neighborhood: "Summerhill", specialty: ["beef", "game", "custom_cuts"] },
  { query: "White House Meats St Lawrence Market Toronto", slug: "white-house-meats", neighborhood: "St. Lawrence Market", specialty: ["beef", "lamb", "game"] },
  { query: "The Butcher Shoppe Toronto", slug: "the-butcher-shoppe", neighborhood: "Liberty Village", specialty: ["beef", "custom_cuts"] },
  { query: "Meat N' Potatoes butcher Etobicoke", slug: "meat-n-potatoes", neighborhood: "Etobicoke", specialty: ["beef", "pork"] },
  { query: "Royal Beef Danforth Toronto", slug: "royal-beef", neighborhood: "Danforth", specialty: ["beef", "poultry", "custom_cuts"] },
  { query: "European Quality Meats Kensington Toronto", slug: "european-quality-meats", neighborhood: "Kensington Market", specialty: ["beef", "pork", "poultry"] },
  { query: "Nosso Talho Toronto", slug: "nosso-talho", neighborhood: "Little Portugal", specialty: ["beef", "pork", "poultry"] },
  { query: "Florence Meat Market The Kingsway Toronto", slug: "florence-meat-market", neighborhood: "The Kingsway", specialty: ["beef", "pork", "custom_cuts"] },
  { query: "La Boucherie butcher Toronto", slug: "la-boucherie", neighborhood: "St. Lawrence Market", specialty: ["beef", "charcuterie"] },
  { query: "Vince Gasparro's Meat Market Toronto", slug: "vince-gasparros", neighborhood: "Bloor West", specialty: ["beef", "pork", "custom_cuts"] },
  { query: "Grace Meat Market Toronto", slug: "grace-meat-market", neighborhood: "Little Italy", specialty: ["beef", "pork", "poultry"] },
  { query: "Bloor Meat Market Toronto", slug: "bloor-meat-market", neighborhood: "Runnymede", specialty: ["beef", "pork", "poultry"] },
  { query: "Speducci Mercatto Toronto", slug: "speducci-mercatto", neighborhood: "Weston", specialty: ["charcuterie", "beef", "lamb"] },
  { query: "Ferraro Butcher Shop Toronto", slug: "ferraro-butcher", neighborhood: "Corso Italia", specialty: ["beef", "pork"] },
  { query: "Butchers of Distinction Toronto", slug: "butchers-of-distinction", neighborhood: "Leslieville", specialty: ["beef", "game", "custom_cuts"] },
  { query: "Beast Butcher Toronto", slug: "beast-butcher", neighborhood: "King West", specialty: ["charcuterie", "pork", "custom_cuts"] },
  { query: "De La Terre Butcher Toronto", slug: "de-la-terre", neighborhood: "East York", specialty: ["beef", "poultry"] },
  { query: "Cote de Boeuf Toronto", slug: "cote-de-boeuf", neighborhood: "Ossington", specialty: ["beef", "charcuterie"] },
  { query: "The Meat Department Toronto butcher", slug: "the-meat-department", neighborhood: "Dovercourt", specialty: ["beef", "pork", "custom_cuts"] },
  { query: "Brothers Meat butcher Toronto", slug: "brothers-meats", neighborhood: "North York", specialty: ["beef", "lamb"] },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  const db = createClient(url, key, { auth: { persistSession: false } });

  let ok = 0;
  const failed: string[] = [];

  for (const c of CANDIDATES) {
    try {
      const hit = await searchPlace(c.query);
      if (!hit) {
        failed.push(`${c.slug}: no Places result`);
        continue;
      }
      const d = await getPlaceDetails(hit.id);

      // Basic sanity: must be in Toronto-ish bounds
      const lat = d.location?.latitude;
      const lng = d.location?.longitude;
      if (lat == null || lng == null || lat < 43.4 || lat > 44.0 || lng < -79.8 || lng > -79.0) {
        failed.push(`${c.slug}: outside Toronto bounds (${lat},${lng})`);
        continue;
      }

      const { error } = await db.from("butchers").upsert(
        {
          slug: c.slug,
          name: d.displayName?.text ?? c.query,
          address: d.formattedAddress ?? null,
          lat,
          lng,
          phone: d.nationalPhoneNumber ?? null,
          website: d.websiteUri ?? null,
          hours: d.regularOpeningHours ?? null,
          neighborhood: c.neighborhood,
          specialty: c.specialty,
          google_place_id: d.id,
          google_rating: d.rating ?? null,
          google_review_count: d.userRatingCount ?? null,
          reviews_synced_at: new Date().toISOString(),
          is_published: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "google_place_id" },
      );
      if (error) throw error;

      ok++;
      console.log(`✓ ${c.slug} — ${d.displayName?.text} (${d.rating}★, ${d.userRatingCount} reviews)`);
      await sleep(250); // stay well under Places QPS limits
    } catch (err) {
      failed.push(`${c.slug}: ${(err as Error).message}`);
    }
  }

  console.log(`\nSeeded ${ok}/${CANDIDATES.length}.`);
  if (failed.length) {
    console.log("Failed (review manually — may be closed or renamed):");
    for (const f of failed) console.log(`  ✗ ${f}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
