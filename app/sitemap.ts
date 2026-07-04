import type { MetadataRoute } from "next";
import { hasSupabaseEnv, supabaseServer } from "@/lib/supabase/server";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const statics: MetadataRoute.Sitemap = [
    { url: BASE, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/methodology`, changeFrequency: "monthly", priority: 0.6 },
  ];

  if (!hasSupabaseEnv()) return statics;

  const db = supabaseServer();
  const { data } = await db
    .from("butchers")
    .select("slug, updated_at")
    .eq("is_published", true);

  return [
    ...statics,
    ...(data ?? []).map((b) => ({
      url: `${BASE}/butcher/${b.slug}`,
      lastModified: b.updated_at ? new Date(b.updated_at) : undefined,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
