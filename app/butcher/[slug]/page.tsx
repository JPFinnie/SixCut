import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { hasSupabaseEnv, supabaseServer } from "@/lib/supabase/server";
import type { Butcher, Media } from "@/lib/types";
import { isOpenNow, todayHoursLine } from "@/lib/hours";
import { StarRating } from "@/components/ui/StarRating";
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
    <main className="mx-auto w-full max-w-3xl px-4 py-6 flex flex-col gap-6">
      <nav>
        <Link href="/" className="text-sm text-oxblood hover:underline">
          ← Back to the map
        </Link>
      </nav>

      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">{butcher.name}</h1>
        <StarRating
          rating={butcher.google_rating}
          count={butcher.google_review_count}
          className="text-lg"
        />
        <div className="text-sm text-ink-soft flex flex-col gap-0.5">
          {butcher.address && <p>{butcher.address}</p>}
          {today && <p>{today}</p>}
          {open != null && (
            <p className={open ? "text-green-700 font-medium" : "text-oxblood font-medium"}>
              {open ? "Open now" : "Closed now"}
            </p>
          )}
          <p className="flex gap-3 mt-1">
            {butcher.phone && (
              <a href={`tel:${butcher.phone}`} className="text-oxblood hover:underline">
                {butcher.phone}
              </a>
            )}
            {butcher.website && (
              <a
                href={butcher.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-oxblood hover:underline"
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
                className="rounded-full bg-parchment px-2.5 py-0.5 text-xs font-medium capitalize"
              >
                {s.replace("_", " ")}
              </span>
            ))}
          </div>
        )}
      </header>

      <section aria-label="Interior">
        <h2 className="text-lg font-semibold mb-2">Step inside</h2>
        <InteriorViewer butcherId={butcher.id} media={media} butcherName={butcher.name} />
      </section>

      <section aria-label="Reviews">
        <h2 className="text-lg font-semibold mb-2">Reviews</h2>
        <ReviewList butcherId={butcher.id} />
      </section>

      {related.length > 0 && (
        <section aria-label="Related butchers">
          <h2 className="text-lg font-semibold mb-2">
            More in {butcher.neighborhood ?? "the area"}
          </h2>
          <ul className="flex flex-col gap-1.5">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/butcher/${r.slug}`}
                  className="text-oxblood hover:underline"
                >
                  {r.name}
                </Link>{" "}
                {r.google_rating != null && (
                  <span className="text-sm text-ink-soft">{r.google_rating}★</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
