import { NextRequest, NextResponse } from "next/server";
import { getPhotoUri } from "@/lib/google/places";

/** Only accept well-formed Places photo resource names (no open redirect). */
const PHOTO_NAME = /^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/;

/**
 * GET /api/photo?name=places/{id}/photos/{ref}&w=1200
 * Redirects to a googleusercontent image URI resolved server-side,
 * so GOOGLE_MAPS_API_KEY never ships to the browser. Cached 24h at the edge.
 */
export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name") ?? "";
  const w = Math.min(Number(req.nextUrl.searchParams.get("w")) || 1200, 1600);

  if (!PHOTO_NAME.test(name)) {
    return NextResponse.json({ error: "bad photo name" }, { status: 400 });
  }

  try {
    const uri = await getPhotoUri(name, w);
    if (!uri) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.redirect(uri, {
      status: 302,
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate" },
    });
  } catch (err) {
    console.error("[/api/photo]", (err as Error).message);
    return NextResponse.json({ error: "photo unavailable" }, { status: 502 });
  }
}
