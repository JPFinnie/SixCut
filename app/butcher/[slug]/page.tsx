import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { hasSupabaseEnv, supabaseServer } from "@/lib/supabase/server";
import type { Butcher, Media } from "@/lib/types";
import { isOpenNow, todayHoursLine } from "@/lib/hours";
import { StarRating } from "@/components/ui/StarRating";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { CleaverLogo } from "@/components/ui/CleaverLogo";
import { InteriorViewer } from "@/components/detail/InteriorViewer";
import { ReviewList } from "@/components/detail/ReviewList";

export const revalidate = 300;

async function getButcher(slug: string) {
  if (!hasSupabaseEnv()) return null; // e.g. CI build without creds
  const db = supabaseServer();
  const { data: butcher } = await db
    .from("butchers")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single<Butcher>();
  if (!butcher) return null;

  const [{ data: media }, { data: related }] = await Promise.all([
    db
      .from("media")
      .select("id, butcher_id, kind, url, source, sort_order")
      .eq("butcher_id", butcher.id)
      .order("sort_order"),
    db
      .from("butchers")
      .select("slug, name, neighborhood, google_rating")
      .eq("is_published", true)
      .eq("neighborhood", butcher.neighborhood ?? "")
      .neq("id", butcher.id)
      .order("google_rating", { ascending: false })
      .limit(3),
  ]);

  return { butcher, media: (media ?? []) as Media[], related: related ?? [] };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const res = await getButcher(slug);
  if (!res) return { title: "Not found — The Six Cut" };
  return {
    title: `${res.butcher.name} — The Six Cut`,
    description: `${res.butcher.name} in ${res.butcher.neighborhood ?? "Toronto"} — hours, reviews, and a look inside.`,
  };
}

export default async function ButcherPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const res = await getButcher(slug);
  if (!res) notFound();
  const { butcher, media, related } = res;

  const open = isOpenNow(butcher.hours);
  const today = todayHoursLine(butcher.hours);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 flex flex-col gap-8">
      <nav className="rise-in flex items-center justify-between">
        <Link
          href="/"
          className="text-sm font-semibold text-oxblood hover:underline underline-offset-4"
        >
          ← Back to the map
        </Link>
        <ThemeToggle />
      </nav>

      <header className="rise-in relative flex flex-col gap-3" style={{ animationDelay: "60ms" }}>
        {butcher.neighborhood && (
          <p className="text-[11px] uppercase tracking-[0.26em] text-oxblood font-bold">
            {butcher.neighborhood} · Toronto
          </p>
        )}
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-display font-black tracking-tight leading-[0.98] text-[clamp(2.2rem,6vw,3.4rem)]">
            {butcher.name}
          </h1>
          {butcher.google_rating != null && (
            <div className="stamp hidden sm:flex flex-col items-center px-3.5 py-2 shrink-0 mt-2 select-none">
              <span className="font-display font-black text-2xl leading-none">
                {butcher.google_rating.toFixed(1)}
              </span>
              <span className="text-[9px] font-bold uppercase">Six Cut grade</span>
            </div>
          )}
        </div>

        <StarRating
          rating={butcher.google_rating}
          count={butcher.google_review_count}
          className="text-lg"
        />

        <div className="text-sm text-muted flex flex-col gap-0.5">
          {butcher.address && <p>{butcher.address}</p>}
          {today && <p>{today}</p>}
          {open != null && (
            <p className={`font-semibold ${open ? "text-brass" : "text-oxblood"}`}>
              {open ? "● Open now" : "○ Closed now"}
            </p>
          )}
          <p className="flex gap-4 mt-1">
            {butcher.phone && (
              <a href={`tel:${butcher.phone}`} className="text-oxblood font-medium hover:underline underline-offset-4">
                {butcher.phone}
              </a>
            )}
            {butcher.website && (
              <a
                href={butcher.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-oxblood font-medium hover:underline underline-offset-4"
              >
                Website ↗
              </a>
            )}
          </p>
        </div>

        {butcher.specialty.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {butcher.specialty.map((s) => (
              <span
                key={s}
                className="rounded-full border border-dashed border-line px-2.5 py-0.5 text-xs font-medium capitalize text-muted"
              >
                {s.replace("_", " ")}
              </span>
            ))}
          </div>
        )}
      </header>

      <section aria-label="Interior" className="rise-in" style={{ animationDelay: "120ms" }}>
        <div className="cut-line mb-4" />
        <h2 className="text-[11px] uppercase tracking-[0.26em] text-muted font-bold mb-3">
          Step inside
        </h2>
        <InteriorViewer butcherId={butcher.id} media={media} butcherName={butcher.name} />
      </section>

      <section aria-label="Reviews" className="rise-in" style={{ animationDelay: "180ms" }}>
        <div className="cut-line mb-4" />
        <h2 className="text-[11px] uppercase tracking-[0.26em] text-muted font-bold mb-3">
          What the neighbourhood says
        </h2>
        <ReviewList butcherId={butcher.id} />
      </section>

      {related.length > 0 && (
        <section aria-label="Related butchers" className="rise-in" style={{ animationDelay: "240ms" }}>
          <div className="cut-line mb-4" />
          <h2 className="text-[11px] uppercase tracking-[0.26em] text-muted font-bold mb-3">
            More in {butcher.neighborhood ?? "the area"}
          </h2>
          <ul className="flex flex-col gap-2">
            {related.map((r) => (
              <li key={r.slug} className="flex items-baseline gap-2">
                <Link
                  href={`/butcher/${r.slug}`}
                  className="font-display font-semibold text-lg text-oxblood hover:underline underline-offset-4"
                >
                  {r.name}
                </Link>
                {r.google_rating != null && (
                  <span className="text-sm text-brass">{r.google_rating}★</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="cut-line pt-4 pb-2 text-center">
        <CleaverLogo size={30} className="text-oxblood mx-auto mb-1.5" />
        <p className="font-display font-black text-oxblood">The Six Cut</p>
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted mt-0.5">
          Know your butcher · Toronto
        </p>
      </footer>
    </main>
  );
}
