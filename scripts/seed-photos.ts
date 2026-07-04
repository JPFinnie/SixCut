/**
 * Photo seed — for each butcher, pull up to 4 Google Places photo resource
 * names and store them as media rows (kind 'photo', source 'google_places').
 * The stored url is the photo *resource name*; /api/photo resolves it at
 * request time so no API key or expiring URI is persisted.
 *
 * Run:  pnpm seed:photos     (re-runnable; replaces prior google_places rows)
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { getPlaceDetails } from "../lib/google/places";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Set Supabase env vars in .env.local");
  const db = createClient(url, key, { auth: { persistSession: false } });

  const { data: butchers, error } = await db
    .from("butchers")
    .select("id, slug, google_place_id")
    .eq("is_published", true);
  if (error) throw error;

  let totalPhotos = 0;
  const failed: string[] = [];

  for (const b of butchers ?? []) {
    if (!b.google_place_id) continue;
    try {
      const details = await getPlaceDetails(b.google_place_id, { withPhotos: true });
      const photos = (details.photos ?? []).slice(0, 4);
      if (photos.length === 0) {
        failed.push(`${b.slug}: no photos on Google`);
        continue;
      }

      // Idempotent: replace previous google_places photos for this butcher
      await db
        .from("media")
        .delete()
        .eq("butcher_id", b.id)
        .eq("source", "google_places");

      const { error: insErr } = await db.from("media").insert(
        photos.map((p, i) => ({
          butcher_id: b.id,
          kind: "photo",
          url: p.name, // resource name; resolved by /api/photo
          source: "google_places",
          sort_order: i,
        })),
      );
      if (insErr) throw insErr;

      totalPhotos += photos.length;
      console.log(`✓ ${b.slug}: ${photos.length} photos`);
      await sleep(200);
    } catch (err) {
      failed.push(`${b.slug}: ${(err as Error).message}`);
    }
  }

  console.log(`\nStored ${totalPhotos} photos across ${(butchers ?? []).length} butchers.`);
  if (failed.length) {
    console.log("Issues:");
    for (const f of failed) console.log(`  ✗ ${f}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
