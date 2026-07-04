/**
 * Unpublish non-retail noise picked up by discovery: processors, wholesalers,
 * event venues, caterers. Re-runnable; prints everything it touches.
 * Run:  pnpm cleanup
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const NON_RETAIL =
  /restaurant|bar show|processing|processor|wholesale|foodservice|food service|catering|distribut/i;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Set Supabase env vars in .env.local");
  const db = createClient(url, key, { auth: { persistSession: false } });

  const { data: butchers, error } = await db
    .from("butchers")
    .select("id, name")
    .eq("is_published", true);
  if (error) throw error;

  const junk = (butchers ?? []).filter((b) => NON_RETAIL.test(b.name));
  if (junk.length === 0) {
    console.log("Nothing to clean up.");
    return;
  }

  for (const b of junk) {
    const { error: upErr } = await db
      .from("butchers")
      .update({ is_published: false, updated_at: new Date().toISOString() })
      .eq("id", b.id);
    if (upErr) throw upErr;
    console.log(`✗ unpublished: ${b.name}`);
  }
  console.log(`\nUnpublished ${junk.length} non-retail entries.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
