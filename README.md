# The Six Cut

**Toronto's independent butchers, on one map.** Every shop gets two numbers:
its Google rating, and the **Six Cut Score** — a transparent /10 built from
semantic-heuristic analysis of recent review text
([methodology](app/methodology/page.tsx), published in-app at `/methodology`).

Built to answer one question: *where is my local butcher?* — and to make
supporting local the easy choice when buying animal products.

## Stack

Next.js 16 (App Router) · Tailwind CSS 4 · Mapbox GL (`react-map-gl/mapbox`) ·
Supabase (Postgres + RLS) · Google Places API (New) · deployed on Vercel.

## Setup

```bash
pnpm install
cp .env.example .env.local   # then fill in values
```

| Variable | What |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project (anon = public reads via RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only; used by scripts, never shipped |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Public Mapbox token (restrict by domain) |
| `GOOGLE_MAPS_API_KEY` | Server-only; Places API (New) enabled |

Apply migrations in `supabase/migrations/` via the Supabase SQL editor
(or `supabase db push`), then:

```bash
pnpm dev            # run the app
```

## Data pipeline (re-runnable, in order)

```bash
pnpm discover       # tile the city with Places nearby-searches, add new shops
pnpm cleanup        # unpublish non-retail noise (processors, wholesalers…)
pnpm seed:photos    # store Places photo resource names per shop
pnpm score          # compute the Six Cut Score for every shop (run monthly)
```

`pnpm seed` re-syncs the original curated list (rarely needed).

## Ground rules

- **Google review text is never persisted** — analyzed live, only derived
  scores stored (Places ToS).
- The Google API key never reaches the browser: photos proxy through
  `/api/photo`, reviews through `/api/butchers/[id]/reviews`.
- Scores are deterministic and pay-proof; the methodology page imports the
  actual weights from [lib/scoring.ts](lib/scoring.ts) so it can't drift.
- 3D interiors (Gaussian splats) are deferred — see [PLAN.md](PLAN.md) §11.
