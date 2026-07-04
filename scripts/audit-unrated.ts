/**
 * Lists published shops with zero Google reviews for manual review.
 *
 * Why this exists: discover.ts only excludes by business-name blocklist —
 * it never checks Google's `types` field or review count, and "manufacturer"
 * is too noisy to filter on (it appears on nearly every butcher_shop listing,
 * including well-reviewed real shops like HQ Meats). A shop with zero reviews
 * AND zero rating has no social proof at all, which is either a brand-new
 * real shop or a wholesale/production listing mistagged as retail — only a
 * human glancing at the name + address can tell which. Run after `discover`.
 *
 * Run:  pnpm audit:unrated
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Set Supabase env vars in .env.local");
  const db = createClient(url, key, { auth: { persistSession: false } });

  const { data, error } = await db
    .from("butchers")
    .select("slug, name, address, neighborhood, is_published")
    .is("google_rating", null);
  if (error) throw error;

  if (!data?.length) {
    console.log("No zero-review shops to review.");
    return;
  }

  console.log(
    `${data.length} zero-review shop(s) (all hidden from the map by policy) — eyeball these:\n`,
  );
  for (const b of data) {
    const noStreetNumber = !/^\d/.test(b.address ?? "");
    console.log(
      `${noStreetNumber ? "⚠ " : "  "}${b.is_published ? "PUBLISHED " : ""}${b.name} — ${b.address ?? "no address"} (${b.neighborhood ?? "?"}) [${b.slug}]`,
    );
  }
  console.log(
    "\n⚠ = no street number, the strongest single tell so far for a non-retail listing.",
  );
  console.log(
    "Zero-review shops publish automatically once pnpm score finds reviews for them.",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
