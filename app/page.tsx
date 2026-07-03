import { hasSupabaseEnv, supabaseServer } from "@/lib/supabase/server";
import { MapExplorer } from "@/components/map/MapExplorer";
import type { ButcherSummary } from "@/lib/types";

export const revalidate = 300; // butcher list changes rarely

async function getButchers(): Promise<ButcherSummary[]> {
  if (!hasSupabaseEnv()) return []; // e.g. CI build without creds
  const db = supabaseServer();
  const { data, error } = await db
    .from("butchers")
    .select(
      "id, slug, name, address, lat, lng, neighborhood, specialty, google_rating, google_review_count, hours",
    )
    .eq("is_published", true)
    .order("google_rating", { ascending: false });
  if (error) console.error("[home] butchers query:", error.message);
  return (data ?? []) as ButcherSummary[];
}

export default async function HomePage() {
  const butchers = await getButchers();
  return (
    <main className="flex flex-col flex-1 h-dvh">
      <MapExplorer butchers={butchers} />
    </main>
  );
}
