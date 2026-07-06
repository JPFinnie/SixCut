import { NextRequest, NextResponse } from "next/server";
import { hasSupabaseEnv, supabaseServer } from "@/lib/supabase/server";
import { SPECIALTIES } from "@/lib/types";

const SUMMARY_COLS =
  "id, slug, name, address, lat, lng, neighborhood, specialty, google_rating, google_review_count, six_cut_score, hours";

/**
 * GET /api/butchers — lean list for the map (PLAN.md §6).
 * Query: neighborhood, minRating, specialty, q (matches name, address,
 * or specialty). (openNow is computed
 * client-side from `hours` to keep this response cacheable.)
 */
export async function GET(req: NextRequest) {
  if (!hasSupabaseEnv()) return NextResponse.json({ butchers: [] });
  const p = req.nextUrl.searchParams;
  const db = supabaseServer();

  let query = db.from("butchers").select(SUMMARY_COLS).eq("is_published", true);

  const minScore = Number(p.get("minScore"));
  if (minScore) query = query.gte("six_cut_score", minScore);

  const specialty = p.get("specialty");
  if (specialty) query = query.contains("specialty", [specialty]);

  const q = p.get("q");
  if (q) {
    const ors = [`name.ilike.%${q}%`, `address.ilike.%${q}%`];
    // "custom cuts" → "custom_cuts"; partial terms like "char" match too.
    const term = q.trim().toLowerCase().replace(/\s+/g, "_");
    for (const s of SPECIALTIES) {
      if (s.includes(term)) ors.push(`specialty.cs.{${s}}`);
    }
    query = query.or(ors.join(","));
  }

  const { data, error } = await query.order("six_cut_score", {
    ascending: false,
    nullsFirst: false,
  });

  if (error) {
    console.error("[/api/butchers]", error.message);
    return NextResponse.json({ butchers: [] }, { status: 500 });
  }

  return NextResponse.json(
    { butchers: data },
    {
      headers: {
        "Cache-Control": "s-maxage=300, stale-while-revalidate=3600",
      },
    },
  );
}
