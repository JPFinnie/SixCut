import { NextRequest, NextResponse } from "next/server";
import { hasSupabaseEnv, supabaseServer } from "@/lib/supabase/server";

const SUMMARY_COLS =
  "id, slug, name, address, lat, lng, neighborhood, specialty, google_rating, google_review_count, six_cut_score, hours";

/**
 * GET /api/butchers — lean list for the map (PLAN.md §6).
 * Query: neighborhood, minRating, specialty, q. (openNow is computed
 * client-side from `hours` to keep this response cacheable.)
 */
export async function GET(req: NextRequest) {
  if (!hasSupabaseEnv()) return NextResponse.json({ butchers: [] });
  const p = req.nextUrl.searchParams;
  const db = supabaseServer();

  let query = db.from("butchers").select(SUMMARY_COLS).eq("is_published", true);

  const neighborhood = p.get("neighborhood");
  if (neighborhood) query = query.eq("neighborhood", neighborhood);

  const minScore = Number(p.get("minScore"));
  if (minScore) query = query.gte("six_cut_score", minScore);

  const specialty = p.get("specialty");
  if (specialty) query = query.contains("specialty", [specialty]);

  const q = p.get("q");
  if (q) query = query.or(`name.ilike.%${q}%,address.ilike.%${q}%`);

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
