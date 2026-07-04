/**
 * Compute/refresh the Six Cut Score for every published butcher.
 * Reviews are fetched live from Google (text never persisted); each run
 * archives per-review SIGNAL COUNTS (review_signals table), and scoring
 * combines this run's reviews with archived signals from the past 30 days —
 * so busy shops are scored on their full recent stream, not just Google's
 * 5-review window. Run monthly:  pnpm score
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { getPlaceDetails, toReviews } from "../lib/google/places";
import { computeFromSignals, extractSignals } from "../lib/scoring";
import type { ReviewSignals } from "../lib/scoring";
import type { Specialty } from "../lib/types";

const ARCHIVE_WINDOW_DAYS = 30;

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

      // Extract per-review signals from this run's live reviews
      const live = (details.reviews ?? []).map((r, i) => ({
        ref: r.name ?? `${b.google_place_id}/reviews/unnamed-${i}`,
        publishedAt: r.publishTime ?? null,
        rating: r.rating,
        signals: extractSignals(r.text?.text ?? ""),
      }));

      // Archive them (idempotent: review_ref is unique, duplicates ignored)
      if (live.length) {
        const { error: archErr } = await db.from("review_signals").upsert(
          live.map((l) => ({
            butcher_id: b.id,
            review_ref: l.ref,
            published_at: l.publishedAt,
            rating: l.rating,
            quality_pos: l.signals.qualityPos,
            quality_neg: l.signals.qualityNeg,
            service_pos: l.signals.servicePos,
            service_neg: l.signals.serviceNeg,
            craft: l.signals.craft,
          })),
          { onConflict: "review_ref", ignoreDuplicates: true },
        );
        if (archErr) throw archErr;
      }

      // Pull archived signals from the window that aren't in this run's batch
      const since = new Date(Date.now() - ARCHIVE_WINDOW_DAYS * 864e5).toISOString();
      const { data: archived, error: archReadErr } = await db
        .from("review_signals")
        .select("review_ref, quality_pos, quality_neg, service_pos, service_neg, craft")
        .eq("butcher_id", b.id)
        .gte("published_at", since);
      if (archReadErr) throw archReadErr;

      const liveRefs = new Set(live.map((l) => l.ref));
      const extra: ReviewSignals[] = (archived ?? [])
        .filter((a) => !liveRefs.has(a.review_ref))
        .map((a) => ({
          qualityPos: a.quality_pos,
          qualityNeg: a.quality_neg,
          servicePos: a.service_pos,
          serviceNeg: a.service_neg,
          craft: a.craft,
        }));

      const result = computeFromSignals(
        [...live.map((l) => l.signals), ...extra],
        details.rating ?? b.google_rating,
        details.userRatingCount ?? b.google_review_count,
        { archived: extra.length },
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
      const n = result?.breakdown.reviewsAnalyzed ?? 0;
      const fromArchive = result?.breakdown.archivedReviews ?? 0;
      console.log(
        `✓ ${b.slug}: ${result ? result.score.toFixed(1) : "unrated"} (${n} reviews analyzed${fromArchive ? `, ${fromArchive} from archive` : ""})`,
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
