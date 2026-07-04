import Link from "next/link";
import type { Metadata } from "next";
import { CleaverLogo } from "@/components/ui/CleaverLogo";

export const metadata: Metadata = {
  title: "Why we built this — The Six Cut",
  description:
    "The Six Cut exists to show you where your local butcher is — and to make supporting local the easy choice when buying animal products.",
};

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 flex flex-col gap-8">
      <nav className="rise-in flex items-center justify-between">
        <Link href="/" className="text-sm font-semibold text-oxblood hover:underline underline-offset-4">
          ← Back to the map
        </Link>
        <CleaverLogo size={26} className="text-oxblood" />
      </nav>

      <header className="rise-in flex flex-col gap-4" style={{ animationDelay: "60ms" }}>
        <p className="text-[11px] uppercase tracking-[0.26em] text-oxblood font-bold">
          Why we built this
        </p>
        <h1 className="font-display font-black tracking-tight leading-[0.98] text-[clamp(2rem,5vw,3rem)]">
          Your butcher is closer than you think.
        </h1>
      </header>

      <section className="rise-in flex flex-col gap-5 leading-relaxed" style={{ animationDelay: "120ms" }}>
        <p>
          Toronto has more than a hundred independent butcher shops — Portuguese
          churrasqueiras on Dundas, halal butchers on Lawrence East, Korean meat
          markets in Willowdale, Italian macellerias on St. Clair, and
          third-generation counters that have been trimming brisket since before
          the towers went up. Most of us drive past them on the way to a
          supermarket.
        </p>
        <p>
          <strong>The Six Cut exists to fix that.</strong> One map of every
          independent butcher in the city, an honest score you can trust, real
          photos, and real reviews — so the next time you buy animal products,
          you know exactly where your local option is.
        </p>
        <div className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="font-display font-bold text-lg mb-2">
            Why it matters
          </h2>
          <ul className="text-sm text-muted flex flex-col gap-2 list-disc pl-5 leading-relaxed">
            <li>
              <strong className="text-foreground">Your money stays local.</strong> A dollar at an
              independent butcher pays a neighbour, not a distribution centre.
            </li>
            <li>
              <strong className="text-foreground">You know what you&apos;re eating.</strong> Independent
              butchers can tell you the farm, the feed, and the cut — and will
              cut it the way you ask.
            </li>
            <li>
              <strong className="text-foreground">Less waste, better meat.</strong> Whole-animal
              butchery and cut-to-order counters throw away less and age better.
            </li>
            <li>
              <strong className="text-foreground">If we don&apos;t use them, we lose them.</strong> Every
              counter on this map survives on people choosing to walk in.
            </li>
          </ul>
        </div>
        <p className="text-muted">
          We don&apos;t take money from shops. Scores come from a{" "}
          <Link href="/methodology" className="text-oxblood hover:underline underline-offset-4">
            published methodology
          </Link>{" "}
          refreshed monthly. Photos and reviews come from the community. The map
          is free and always will be.
        </p>
        <p className="font-display italic text-lg">
          Support local. Know your butcher.
        </p>
      </section>

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
