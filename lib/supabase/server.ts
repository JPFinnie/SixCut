import { createClient } from "@supabase/supabase-js";

/**
 * True when Supabase env vars are configured AND well-formed (guards builds
 * without creds and builds with mis-pasted values — a malformed URL must
 * degrade to an empty site, never crash the deploy).
 */
export function hasSupabaseEnv(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  try {
    new URL(url);
  } catch {
    console.warn("[supabase] NEXT_PUBLIC_SUPABASE_URL is not a valid URL — check the env var value");
    return false;
  }
  return true;
}

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
