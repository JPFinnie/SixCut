import Link from "next/link";
import type { Metadata } from "next";
import { WEIGHTS, LEXICON } from "@/lib/scoring";
import { CleaverLogo } from "@/components/ui/CleaverLogo";

export const metadata: Metadata = {
  title: "How we score — The Six Cut",
  description:
    "The published methodology behind the Six Cut Score: a transparent /10 score built from semantic analysis of recent reviews, refreshed monthly.",
};

const COMPONENTS: Array<{
  key: keyof typeof WEIGHTS;
  name: string;
  what: string;
  how: string;
}> = [
  {
    key: "quality",
    name: "Meat quality",
    what: "What reviewers say about the product itself.",
    how: `Review text is scanned for ${LEXICON.qualityPos.length} positive quality signals (fresh, tender, marbling, dry-aged…) against ${LEXICON.qualityNeg.length} negative ones (tough, gristle, off smells…). The balance, smoothed so a single mention never dominates, becomes the component score.`,
  },
  {
    key: "service",
    name: "Service",
    what: "What reviewers say about the people behind the counter.",
    how: `The same balance approach across ${LEXICON.servicePos.length} positive service signals (knowledgeable, helpful, welcoming…) and ${LEXICON.serviceNeg.length} negative ones (rude, ignored, overcharged…).`,
  },
  {
    key: "craft",
    name: "Butchercraft",
    what: "Evidence of real butcher expertise, not just a meat counter.",
    how: `We look for ${LEXICON.craft.length} craft markers — custom cuts, cut-to-order, dry-aging, house-made sausage and charcuterie, special orders, whole-animal work. Four or more distinct mentions earns full marks.`,
  },
  {
    key: "rating",
    name: "Rating foundation",
    what: "The shop's overall Google rating, normalized.",
    how: "A 5.0 shop earns full marks, a 3.0 shop earns zero — review language above tells us the rest of the story.",
  },
  {
    key: "volume",
    name: "Review volume",
    what: "Confidence: a 4.9 from 500 reviews beats a 5.0 from 2.",
    how: "Log-scaled review count; roughly 500 reviews earns full marks, so big shops can't simply buy the top spot with volume alone.",
  },
];

export default function MethodologyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 flex flex-col gap-8">
      <nav className="rise-in flex items-center justify-between">
        <Link href="/" className="text-sm font-semibold text-oxblood hover:underline underline-offset-4">
          ← Back to the map
        </Link>
        <CleaverLogo size={26} className="text-oxblood" />
      </nav>

      <header className="rise-in flex flex-col gap-3" style={{ animationDelay: "60ms" }}>
        <p className="text-[11px] uppercase tracking-[0.26em] text-oxblood font-bold">
          Published methodology
        </p>
        <h1 className="font-display font-black tracking-tight leading-[0.98] text-[clamp(2rem,5vw,3rem)]">
          How the Six Cut Score works
        </h1>
        <p className="text-muted leading-relaxed">
          Every shop gets two numbers: its Google rating, straight from Google —
          and the <strong className="text-foreground">Six Cut Score</strong>, ours. The Six Cut
          Score is a /10 built by reading what reviewers actually <em>say</em>, not just
          the stars they leave. It is fully deterministic: same reviews in, same
          score out. No black box, no pay-to-play, no editorializing.
        </p>
      </header>

      <section className="rise-in flex flex-col gap-4" style={{ animationDelay: "120ms" }}>
        <div className="cut-line" />
        <h2 className="text-[11px] uppercase tracking-[0.26em] text-muted font-bold">
          The five components
        </h2>
        {COMPONENTS.map((c) => (
          <div key={c.key} className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-display font-bold text-lg">{c.name}</h3>
              <span className="stamp px-2 py-0.5 text-xs font-bold shrink-0">
                {WEIGHTS[c.key] * 100}%
              </span>
            </div>
            <p className="text-sm mt-1.5">{c.what}</p>
            <p className="text-sm text-muted mt-1.5 leading-relaxed">{c.how}</p>
          </div>
        ))}
      </section>

      <section className="rise-in flex flex-col gap-3" style={{ animationDelay: "180ms" }}>
        <div className="cut-line" />
        <h2 className="text-[11px] uppercase tracking-[0.26em] text-muted font-bold">
          The fine print
        </h2>
        <ul className="text-sm text-muted leading-relaxed flex flex-col gap-2 list-disc pl-5">
          <li>
            Scores are recomputed <strong className="text-foreground">monthly</strong> from the most
            recent reviews Google provides, so a shop that improves, improves.
          </li>
          <li>
            Google shares at most <strong className="text-foreground">5 recent reviews</strong> per
            shop. When fewer are available to analyze, the text components earn
            proportionally less weight and the difference shifts to the rating
            foundation — thin evidence is never treated as strong evidence.
          </li>
          <li>
            We analyze review text live and store only the resulting numbers —
            never the reviews themselves.
          </li>
          <li>
            Shops with no reviews yet show &ldquo;—&rdquo; rather than a guess.
          </li>
          <li>
            Every shop&apos;s page shows its full component breakdown. If you think a
            score is wrong, the receipts are right there.
          </li>
          <li>
            No shop can pay to change its score. There is nothing to buy.
          </li>
        </ul>
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
