/**
 * Unpublish a single shop by slug (soft-delete: is_published = false, kept
 * in the database, dropped from the map/API).
 * Run:  pnpm exec tsx scripts/unpublish.ts <slug>
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error("Usage: pnpm exec tsx scripts/unpublish.ts <slug>");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Set Supabase env vars in .env.local");
  const db = createClient(url, key, { auth: { persistSession: false } });

  const { data, error } = await db
    .from("butchers")
    .update({ is_published: false, updated_at: new Date().toISOString() })
    .eq("slug", slug)
    .select("name")
    .single();
  if (error) throw error;

  console.log(`✗ Unpublished: ${data.name} (${slug})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
