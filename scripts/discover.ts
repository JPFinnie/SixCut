/**
 * Discovery — tile Toronto with Places nearby searches (type butcher_shop),
 * add every operational independent butcher not already in the database.
 * Chains/groceries excluded by name. Neighborhood = nearest centroid.
 *
 * Run:  pnpm discover        (then `pnpm seed:photos` for new galleries)
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { searchNearby, getPlaceDetails } from "../lib/google/places";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** ~5km circles covering Toronto proper (downtown to Scarborough/Etobicoke/North York). */
const TILES: Array<{ latitude: number; longitude: number }> = [
  { latitude: 43.648, longitude: -79.396 }, // downtown west
  { latitude: 43.655, longitude: -79.34 },  // east end / Leslieville
  { latitude: 43.68, longitude: -79.3 },    // Beaches / Birch Cliff
  { latitude: 43.69, longitude: -79.43 },   // St. Clair W / Forest Hill
  { latitude: 43.665, longitude: -79.465 }, // Junction / Bloor West
  { latitude: 43.63, longitude: -79.51 },   // south Etobicoke
  { latitude: 43.7, longitude: -79.51 },    // Weston / Mount Dennis
  { latitude: 43.72, longitude: -79.28 },   // SW Scarborough
  { latitude: 43.77, longitude: -79.25 },   // NE Scarborough
  { latitude: 43.76, longitude: -79.41 },   // North York central
  { latitude: 43.71, longitude: -79.39 },   // Midtown
  { latitude: 43.75, longitude: -79.51 },   // Downsview / north Etobicoke
  { latitude: 43.79, longitude: -79.19 },   // Malvern / Rouge
];

/** Chains & groceries that carry a butcher counter but aren't independents. */
const BLOCKLIST =
  /loblaws|metro|sobeys|costco|walmart|no frills|food basics|freshco|longo|whole foods|farm boy|t&t|h mart|nations|fortinos|zehrs|superstore|pusateri|grocer|supermarket|iga\b/i;

/** Neighborhood centroids for nearest-match assignment. */
const HOODS: Array<[string, number, number]> = [
  ["Kensington Market", 43.6547, -79.4005],
  ["Trinity Bellwoods", 43.647, -79.413],
  ["Leslieville", 43.662, -79.33],
  ["Danforth", 43.6785, -79.35],
  ["The Beaches", 43.671, -79.296],
  ["St. Lawrence Market", 43.6487, -79.3715],
  ["Liberty Village", 43.6383, -79.42],
  ["King West", 43.6442, -79.4],
  ["Ossington", 43.649, -79.42],
  ["Little Italy", 43.6547, -79.4185],
  ["Little Portugal", 43.6474, -79.4295],
  ["Parkdale", 43.6383, -79.435],
  ["High Park", 43.6465, -79.4637],
  ["The Junction", 43.6655, -79.4658],
  ["Bloor West Village", 43.6493, -79.484],
  ["The Kingsway", 43.6475, -79.511],
  ["Etobicoke", 43.6205, -79.5132],
  ["Mimico", 43.6166, -79.4968],
  ["Weston", 43.7001, -79.5162],
  ["Corso Italia", 43.6784, -79.4463],
  ["St. Clair West", 43.6817, -79.4265],
  ["Forest Hill", 43.6939, -79.414],
  ["Yorkville", 43.6709, -79.3933],
  ["Church-Wellesley", 43.6659, -79.3805],
  ["Cabbagetown", 43.6667, -79.3664],
  ["Riverdale", 43.6667, -79.3525],
  ["East York", 43.6905, -79.3277],
  ["Scarborough", 43.7764, -79.2318],
  ["North York", 43.7615, -79.4111],
  ["Yonge-Eglinton", 43.7068, -79.3985],
  ["Summerhill", 43.6822, -79.3907],
  ["Rosedale", 43.6795, -79.3805],
  ["York", 43.689, -79.487],
  ["Dovercourt", 43.665, -79.4353],
  ["Runnymede", 43.6515, -79.4765],
  ["Roncesvalles", 43.6465, -79.4483],
  ["Davisville", 43.7043, -79.3887],
  ["Leaside", 43.7047, -79.3663],
  ["Don Mills", 43.7615, -79.3435],
  ["Agincourt", 43.7853, -79.2785],
  ["Birch Cliff", 43.6915, -79.2643],
  ["Wexford", 43.7455, -79.2941],
  ["Downsview", 43.7543, -79.4985],
  ["Willowdale", 43.7701, -79.4085],
  ["Islington", 43.6453, -79.5241],
  ["Long Branch", 43.5925, -79.5442],
  ["Rexdale", 43.7167, -79.5675],
  ["The Annex", 43.6702, -79.4072],
  ["Oakwood Village", 43.6835, -79.4405],
  ["Mount Dennis", 43.6866, -79.4956],
  ["Thorncliffe Park", 43.7047, -79.3494],
  ["Cliffside", 43.7112, -79.2482],
];

function nearestHood(lat: number, lng: number): string {
  let best = "Toronto";
  let bestD = Infinity;
  for (const [name, hLat, hLng] of HOODS) {
    const d = (lat - hLat) ** 2 + ((lng - hLng) * 0.72) ** 2; // rough lat/lng scaling
    if (d < bestD) {
      bestD = d;
      best = name;
    }
  }
  return best;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Set Supabase env vars in .env.local");
  const db = createClient(url, key, { auth: { persistSession: false } });

  const { data: existing, error: exErr } = await db
    .from("butchers")
    .select("google_place_id, slug");
  if (exErr) throw exErr;
  const knownIds = new Set((existing ?? []).map((b) => b.google_place_id));
  const knownSlugs = new Set((existing ?? []).map((b) => b.slug));

  // 1. Tile the city, collect unique candidate place IDs
  const candidates = new Map<string, string>(); // id -> name
  for (const tile of TILES) {
    try {
      const places = await searchNearby(tile, 5000);
      for (const p of places) {
        if (p.businessStatus && p.businessStatus !== "OPERATIONAL") continue;
        if (!knownIds.has(p.id)) candidates.set(p.id, p.displayName?.text ?? "?");
      }
      await sleep(150);
    } catch (err) {
      console.error(`tile (${tile.latitude},${tile.longitude}): ${(err as Error).message}`);
    }
  }
  console.log(`Found ${candidates.size} new candidate butcher shops.\n`);

  // 2. Details, filter, insert
  let added = 0;
  const skipped: string[] = [];
  for (const [placeId, roughName] of candidates) {
    try {
      if (BLOCKLIST.test(roughName)) {
        skipped.push(`${roughName} (chain/grocery)`);
        continue;
      }
      const d = await getPlaceDetails(placeId);
      const name = d.displayName?.text ?? roughName;
      if (BLOCKLIST.test(name)) {
        skipped.push(`${name} (chain/grocery)`);
        continue;
      }
      if (d.businessStatus && d.businessStatus !== "OPERATIONAL") {
        skipped.push(`${name} (${d.businessStatus})`);
        continue;
      }
      const lat = d.location?.latitude;
      const lng = d.location?.longitude;
      if (lat == null || lng == null || lat < 43.55 || lat > 43.9 || lng < -79.65 || lng > -79.1) {
        skipped.push(`${name} (outside Toronto)`);
        continue;
      }

      let slug = slugify(name);
      if (knownSlugs.has(slug)) slug = `${slug}-${placeId.slice(-5).toLowerCase()}`;
      knownSlugs.add(slug);

      const { error } = await db.from("butchers").insert({
        slug,
        name,
        address: d.formattedAddress ?? null,
        lat,
        lng,
        phone: d.nationalPhoneNumber ?? null,
        website: d.websiteUri ?? null,
        hours: d.regularOpeningHours ?? null,
        neighborhood: nearestHood(lat, lng),
        specialty: [],
        google_place_id: d.id,
        google_rating: d.rating ?? null,
        google_review_count: d.userRatingCount ?? null,
        reviews_synced_at: new Date().toISOString(),
        is_published: true,
      });
      if (error) throw error;
      added++;
      console.log(`✓ ${name} — ${nearestHood(lat, lng)} (${d.rating ?? "—"}★, ${d.userRatingCount ?? 0})`);
      await sleep(150);
    } catch (err) {
      skipped.push(`${roughName}: ${(err as Error).message}`);
    }
  }

  console.log(`\nAdded ${added} new butchers.`);
  if (skipped.length) {
    console.log(`Skipped ${skipped.length}:`);
    for (const s of skipped) console.log(`  · ${s}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
