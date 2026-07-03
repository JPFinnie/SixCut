import { NextResponse } from "next/server";
import { hasSupabaseEnv, supabaseServer } from "@/lib/supabase/server";
import { getPlaceDetails, toReviews } from "@/lib/google/places";

/**
 * GET /api/butchers/[id]/reviews — live Google reviews (PLAN.md §6).
 * Never persisted (Google ToS); cached 24h. Fails soft with { reviews: [] }.
 */
export const revalidate = 86400;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!hasSupabaseEnv()) return NextResponse.json({ reviews: [] });
  try {
    const db = supabaseServer();
    const { data: butcher } = await db
      .from("butchers")
      .select("google_place_id")
      .eq("id", id)
      .single();

    if (!butcher?.google_place_id) return NextResponse.json({ reviews: [] });

    const details = await getPlaceDetails(butcher.google_place_id, {
      withReviews: true,
    });
    return NextResponse.json(
      { reviews: toReviews(details) },
      { headers: { "Cache-Control": "s-maxage=86400, stale-while-revalidate" } },
    );
  } catch (err) {
    console.error("[/api/butchers/reviews]", (err as Error).message);
    return NextResponse.json({ reviews: [] }); // never 500 the page
  }
}
