/**
 * Compute/refresh the Six Cut Score for every published butcher.
 * Reviews are fetched live from Google (never persisted); only the derived
 * score + breakdown are stored. Run monthly:  pnpm score
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { getPlaceDetails, toReviews } from "../lib/google/places";
import { computeSixCutScore } from "../lib/scoring";
import type { Specialty } from "../lib/types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Infer specialties from review language — only fills shops with none set. */
const SPECIALTY_SIGNALS: Array<[Specialty, RegExp]> = [
  ["beef", /\b(steak|beef|brisket|ribeye|striploin|tenderloin)\b/i],
  ["pork", /\b(pork|bacon|ham|ribs|porchetta)\b/i],
  ["poultry", /\b(chicken|poultry|turkey|duck|quail)\b/i],
  ["lamb", /\b(lamb|goat|mutton)\b/i],
  ["game", /\b(venison|bison|elk|rabbit|game meat|wild boar)\b/i],
  ["charcuterie", /\b(sausage|charcuterie|salami|prosciutto|cured|deli)\b/i],
  ["custom_cuts", /\b(custom cut|cut to order|special order|butcher counter)\b/i],
];

function inferSpecialties(texts: string[]): Specialty[] {
  const corpus = texts.join(" ");
  return SPECIALTY_SIGNALS.filter(([, re]) => re.test(corpus))
    .map(([s]) => s)
    .slice(0, 4);
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Set Supabase env vars in .env.local");
  const db = createClient(url, key, { auth: { persistSession: false } });

  // Include unpublished zero-review shops: if Google now has reviews for
  // them, they earn their spot on the map (see audit-unrated.ts policy).
  const { data: butchers, error } = await db
    .from("butchers")
    .select(
      "id, slug, google_place_id, google_rating, google_review_count, specialty, is_published",
    )
    .or("is_published.eq.true,google_rating.is.null");
  if (error) throw error;

  let scored = 0;
  const issues: string[] = [];

  for (const b of butchers ?? []) {
    if (!b.google_place_id) continue;
    try {
      const details = await getPlaceDetails(b.google_place_id, { withReviews: true });
      const reviews = toReviews(details);
      const result = computeSixCutScore(
        reviews,
        details.rating ?? b.google_rating,
        details.userRatingCount ?? b.google_review_count,
      );

      const update: Record<string, unknown> = {
        six_cut_score: result?.score ?? null,
        six_cut_breakdown: result?.breakdown ?? null,
        six_cut_scored_at: new Date().toISOString(),
        // refresh the Google aggregates while we're here
        google_rating: details.rating ?? b.google_rating,
        google_review_count: details.userRatingCount ?? b.google_review_count,
        updated_at: new Date().toISOString(),
      };

      // Enrich empty specialties from review language (never overwrites curation)
      if (!b.specialty?.length && reviews.length > 0) {
        const inferred = inferSpecialties(reviews.map((r) => r.text));
        if (inferred.length) update.specialty = inferred;
      }

      // Zero-review shops are hidden by policy; publish once reviews exist.
      const nowHasReviews = (details.userRatingCount ?? 0) > 0;
      if (!b.is_published && nowHasReviews) update.is_published = true;
      if (b.is_published === false && !nowHasReviews) update.six_cut_score = null;

      const { error: upErr } = await db.from("butchers").update(update).eq("id", b.id);
      if (upErr) throw upErr;

      scored++;
      console.log(
        `✓ ${b.slug}: ${result ? result.score.toFixed(1) : "unrated"} (${result?.breakdown.reviewsAnalyzed ?? 0} reviews analyzed)`,
      );
      await sleep(150);
    } catch (err) {
      issues.push(`${b.slug}: ${(err as Error).message}`);
    }
  }

  console.log(`\nScored ${scored}/${(butchers ?? []).length}.`);
  if (issues.length) {
    console.log("Issues:");
    for (const i of issues) console.log(`  ✗ ${i}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
