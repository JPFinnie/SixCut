import { createClient } from "@supabase/supabase-js";

/**
 * Anon-key client for server-side reads (RLS-protected).
 * No auth/session handling needed — this app has no user auth (PLAN.md §10).
 */
export function supabaseServer() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}

/**
 * Service-role client — ingestion/scripts ONLY. Never import from
 * client components or anything shipped to the browser.
 */
export function supabaseAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false },
  });
}
