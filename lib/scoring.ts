/**
 * The Six Cut Score — a transparent, deterministic /10 score built from
 * semantic-heuristic analysis of recent Google review text plus rating
 * fundamentals. No black box: this file IS the methodology. The /methodology
 * page imports these weights and lexicons so the published method can never
 * drift from the code. Scores refresh monthly (pnpm score).
 *
 * Review text is analyzed live and never persisted — only the derived
 * numeric score, component breakdown, and per-review signal counts
 * (review_signals table) are stored. Archived signals from the past 30
 * days join each scoring run, so the analyzed pool deepens monthly beyond
 * Google's 5-review window and scores normalise over time.
 */

export const WEIGHTS = {
  quality: 0.4, // what reviewers say about the meat itself
  service: 0.2, // what reviewers say about the people
  craft: 0.15, // markers of real butchercraft
  rating: 0.15, // Google rating, normalized
  volume: 0.1, // confidence from review count
} as const;

/**
 * Terms match on word boundaries (a trailing wildcard is allowed, so "marbl"
 * hits marbled/marbling but "sour" can never hit "sourced"). Multi-word
 * entries match as phrases. Negated praise ("don't recommend") is listed on
 * the negative side so it cancels the positive hit.
 */
export const LEXICON = {
  qualityPos: [
    "fresh", "freshest", "tender", "juicy", "marbl", "dry aged", "dry-aged",
    "well aged", "flavour", "flavor", "delicious", "excellent", "premium",
    "organic", "grass-fed", "grass fed", "local farm", "best meat",
    "great quality", "high quality", "top quality", "quality meat",
    "quality cuts", "best quality",
  ],
  qualityNeg: [
    "rancid", "spoiled", "bad smell", "smelled off", "smells off", "smelly",
    "sour smell", "sour taste", "gristle", "tough", "slimy", "gray meat",
    "grey meat", "freezer burn", "expired", "went bad", "not fresh",
    "poor quality", "bad quality", "low quality",
  ],
  servicePos: [
    "friendly", "helpful", "knowledgeable", "welcoming", "recommend",
    "great service", "excellent service", "attentive", "patient",
    "went above", "very kind", "so kind",
  ],
  serviceNeg: [
    "rude", "unhelpful", "ignored", "attitude", "overcharg", "rip off",
    "ripoff", "scam", "terrible service", "bad service", "dismissive",
    "not recommend", "don't recommend", "do not recommend",
    "wouldn't recommend", "never again",
  ],
  craft: [
    "custom cut", "cut to order", "dry-aged", "dry aged", "house-made",
    "housemade", "house made", "sausage", "charcuterie", "special order",
    "marinat", "deboned", "trimmed", "butcher knows", "whole animal",
    "halal", "kosher",
  ],
} as const;

export interface ScoreBreakdown {
  quality: number;
  service: number;
  craft: number;
  rating: number;
  volume: number;
  reviewsAnalyzed: number;
  /** 0..1 — how much of the text weight was actually usable (n/4, capped). */
  textCoverage: number;
  /** How many analyzed reviews came from the 30-day signal archive. */
  archivedReviews?: number;
}

/**
 * Per-review lexicon hit counts — the ONLY thing we ever persist about a
 * review (review_signals table). Derived analysis, never text.
 */
export interface ReviewSignals {
  qualityPos: number;
  qualityNeg: number;
  servicePos: number;
  serviceNeg: number;
  craft: number;
}

export interface SixCutScore {
  score: number; // 0..10, one decimal
  breakdown: ScoreBreakdown;
}

const matcherCache = new Map<string, RegExp>();

/** Word-boundary matcher: single tokens match as prefixes ("marbl" → marbled),
 *  never as suffixes ("sour" ✗ "sourced"). Phrases match verbatim. */
function matcher(term: string): RegExp {
  let re = matcherCache.get(term);
  if (!re) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    re = new RegExp(`\\b${escaped}\\w*`, "g");
    matcherCache.set(term, re);
  }
  return re;
}

function hits(text: string, terms: readonly string[]): number {
  let n = 0;
  for (const term of terms) {
    const found = text.match(matcher(term));
    if (found) n += Math.min(found.length, 3); // cap per term per review
  }
  return n;
}

/** Laplace-smoothed positive ratio: no signal → neutral 0.5. */
const ratio = (pos: number, neg: number) => (pos + 1) / (pos + neg + 2);

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** Extract lexicon signal counts from one review's text. */
export function extractSignals(text: string): ReviewSignals {
  const t = text.toLowerCase();
  return {
    qualityPos: hits(t, LEXICON.qualityPos),
    qualityNeg: hits(t, LEXICON.qualityNeg),
    servicePos: hits(t, LEXICON.servicePos),
    serviceNeg: hits(t, LEXICON.serviceNeg),
    craft: hits(t, LEXICON.craft),
  };
}

export function computeSixCutScore(
  reviews: Array<{ text: string }>,
  googleRating: number | null,
  reviewCount: number | null,
): SixCutScore | null {
  return computeFromSignals(
    reviews.map((r) => extractSignals(r.text)),
    googleRating,
    reviewCount,
  );
}

/**
 * Score from per-review signals. Live reviews and archived signals are
 * interchangeable here — which is what lets the analyzed pool deepen
 * month over month without ever storing review text.
 */
export function computeFromSignals(
  signals: ReviewSignals[],
  googleRating: number | null,
  reviewCount: number | null,
  meta: { archived?: number } = {},
): SixCutScore | null {
  // Nothing to go on: no rating and no reviews → unrated.
  if (googleRating == null && signals.length === 0) return null;

  let qp = 0, qn = 0, sp = 0, sn = 0, cr = 0;
  for (const s of signals) {
    qp += s.qualityPos;
    qn += s.qualityNeg;
    sp += s.servicePos;
    sn += s.serviceNeg;
    cr += s.craft;
  }

  // How much text evidence we actually have. Google exposes at most 5
  // recent reviews per fetch; the 30-day archive grows this pool monthly.
  // 4+ analyzable reviews earns full text weight.
  const textCoverage = clamp01(signals.length / 4);

  const breakdown: ScoreBreakdown = {
    quality: ratio(qp, qn),
    service: ratio(sp, sn),
    craft: clamp01(cr / 4), // 4+ craft markers = full marks
    rating: googleRating != null ? clamp01((googleRating - 3) / 2) : 0.5,
    volume: clamp01(Math.log10((reviewCount ?? 0) + 1) / 2.7), // ~500 reviews = full marks
    reviewsAnalyzed: signals.length,
    textCoverage,
    ...(meta.archived ? { archivedReviews: meta.archived } : {}),
  };

  // Text components earn only as much weight as their evidence supports;
  // unearned text weight shifts to the rating foundation. With zero
  // analyzable reviews the score is simply normalized rating + volume.
  const wQuality = WEIGHTS.quality * textCoverage;
  const wService = WEIGHTS.service * textCoverage;
  const wCraft = WEIGHTS.craft * textCoverage;
  const wRating =
    WEIGHTS.rating +
    (WEIGHTS.quality + WEIGHTS.service + WEIGHTS.craft) * (1 - textCoverage);

  const score =
    wQuality * breakdown.quality +
    wService * breakdown.service +
    wCraft * breakdown.craft +
    wRating * breakdown.rating +
    WEIGHTS.volume * breakdown.volume;

  return { score: Math.round(score * 100) / 10, breakdown };
}
