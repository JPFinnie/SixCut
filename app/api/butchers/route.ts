import { NextRequest, NextResponse } from "next/server";
import { hasSupabaseEnv, supabaseServer } from "@/lib/supabase/server";

const SUMMARY_COLS =
  "id, slug, name, address, lat, lng, neighborhood, specialty, google_rating, google_review_count, hours";

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

  const minRating = Number(p.get("minRating"));
  if (minRating) query = query.gte("google_rating", minRating);

  const specialty = p.get("specialty");
  if (specialty) query = query.contains("specialty", [specialty]);

  const q = p.get("q");
  if (q) query = query.or(`name.ilike.%${q}%,address.ilike.%${q}%`);

  const { data, error } = await query.order("google_rating", {
    ascending: false,
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
