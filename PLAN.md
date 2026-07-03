# The Six Cut — Build Plan (MVP)

> **Handoff document.** This is the authoritative build plan. It supersedes the
> original technical spec wherever they conflict. Build exactly what's here.
> Read the **Corrections to the original spec** section first — the original
> spec contains a load-bearing technical error.

**Owner:** James · **Executor:** Fable · **Stack:** Next.js 14 (App Router) + Vercel + Supabase + Mapbox + Google Places API
**Scope:** Interactive map of ~20 independent Toronto butchers, with live Google ratings/reviews and an interior media viewer. **3D Gaussian splats are deferred** (see below).

---

## 0. Corrections to the original spec (read this first)

1. **Fable 5 does NOT generate Gaussian splats.** Fable 5 (`claude-fable-5`) is a
   large language model. There is no "photo → `.ply` splat" Fable API. **Do not
   build any Fable-5 splat integration.** Producing real splats is a
   photogrammetry/3DGS job (Luma AI, Polycam, Postshot, etc.) and is **out of
   scope for this MVP.**

2. **Splats are deferred.** For MVP, each butcher's "interior" is shown as a
   **photo/media gallery** plus an optional **Google Street View / 360 embed**.
   Build the interior viewer behind a clean `InteriorViewer` interface so a real
   3D Gaussian splat renderer can drop in later without touching callers.

3. **Do not persist Google review *text* in the database.** Google Places API
   terms restrict caching/storing review content and cap reviews at **5 per
   place**. Store only the aggregate `google_rating`, `google_review_count`, and
   `google_place_id` in Supabase (used for map filtering/sorting). Fetch
   individual review text **live** via a server route with short-lived caching.

4. **Interior viewer is a media gallery, not `THREE.PointsGeometry`.** (When
   splats return later, use `@mkkellogg/gaussian-splats-3d`, not raw Three.js
   points — points render a flat cloud, not real gaussian splatting.)

5. **No async job queue / Vercel Workflow / multi-service backend for MVP.**
   Single Next.js app. Revisit Vercel Workflow only if a hosted splat API is
   added post-MVP.

---

## 1. Tech stack (final)

| Concern | Choice |
|---|---|
| Framework | Next.js 14, App Router, TypeScript |
| Styling | Tailwind CSS |
| Map | Mapbox GL JS (`mapbox-gl` + `react-map-gl`) |
| State | Zustand (map/UI state) |
| DB | Supabase (Postgres) |
| DB access | `@supabase/supabase-js` v2 + `@supabase/ssr` |
| Reviews/discovery | Google Places API (New) |
| Media/interior | Photo gallery + Street View embed (splat-ready interface) |
| Hosting | Vercel (GitHub integration, preview deploys) |
| Package manager | pnpm |

> Before writing library-specific code, verify current APIs against docs
> (Next.js App Router, `@supabase/ssr`, `react-map-gl` v7+, Places API New).
> Do not rely on memorized signatures.

---

## 2. Environment variables

Create `.env.local` (local) and set the same in Vercel Project Settings.

```bash
# Supabase (James will provide)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=            # server-only, never NEXT_PUBLIC

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=

# Google (server-only)
GOOGLE_MAPS_API_KEY=                  # Places API (New) + Geocoding enabled
```

Add `.env.local` to `.gitignore`. Commit `.env.example` with the keys above (no values).

---

## 3. Database schema (Supabase)

Put this at `supabase/migrations/0001_init.sql`. Key change vs. original spec:
`reviews` table stores **no review text**; aggregates live on `butchers`.

```sql
-- Extensions
create extension if not exists "pgcrypto";

-- Butchers
create table butchers (
  id                  uuid primary key default gen_random_uuid(),
  slug                text unique not null,               -- e.g. 'sanagans-meat-locker'
  name                text not null,
  address             text,
  lat                 double precision,
  lng                 double precision,
  phone               text,
  website             text,
  hours               jsonb,                              -- Places opening_hours
  neighborhood        text,
  specialty           text[] default '{}',                -- ['beef','pork','game','custom_cuts']
  google_place_id     text unique,
  google_rating       numeric(2,1),                       -- aggregate snapshot (OK to store)
  google_review_count integer,
  reviews_synced_at   timestamptz,
  is_published        boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Interior media (photos / 360 for MVP; splat rows added later)
create table media (
  id          uuid primary key default gen_random_uuid(),
  butcher_id  uuid not null references butchers(id) on delete cascade,
  kind        text not null default 'photo',              -- 'photo' | 'streetview' | 'splat'(future)
  url         text not null,
  storage_path text,                                      -- Supabase Storage path if uploaded
  source      text,                                       -- 'manual' | 'google_places' | 'upload'
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- Indexes for map/list performance
create index butchers_published_idx on butchers (is_published);
create index butchers_rating_idx    on butchers (google_rating desc);
create index butchers_neighborhood_idx on butchers (neighborhood);
create index butchers_specialty_gin  on butchers using gin (specialty);
create index butchers_geo_idx        on butchers (lat, lng);
create index media_butcher_idx       on media (butcher_id, sort_order);

-- RLS: public read of published data, writes via service role only
alter table butchers enable row level security;
alter table media    enable row level security;

create policy "public read published butchers"
  on butchers for select using (is_published = true);
create policy "public read media"
  on media for select using (true);
-- (No public insert/update/delete policies: service role bypasses RLS for ingestion.)
```

> **Deferred (do not create yet):** a `splats` table. When splats return, add
> `media.kind='splat'` rows or a dedicated table. Left out to avoid dead schema.

---

## 4. Data ingestion

One-time / re-runnable seed script at `scripts/seed.ts` (run with `tsx`, uses
`SUPABASE_SERVICE_ROLE_KEY` + `GOOGLE_MAPS_API_KEY`). Flow per butcher:

1. Text Search / Find Place (Places API New) by name + "Toronto" → resolve
   `place_id`.
2. Place Details → `name, formattedAddress, location{lat,lng}, nationalPhoneNumber,
   websiteUri, regularOpeningHours, rating, userRatingCount`.
3. Derive `neighborhood` (from address, or a manual map) and `specialty`
   (manual per butcher).
4. Upsert into `butchers` (conflict on `google_place_id`), set
   `reviews_synced_at = now()`.
5. Interior media: manually curate 3–8 photo URLs per butcher into `media`
   (kind `photo`) and/or a `streetview` entry. (No scraping required for MVP —
   curate by hand for quality.)

**Seed candidates (real Toronto independent butchers — verify each `place_id`,
address, and coords via Places API; exclude anything closed):**

- Sanagan's Meat Locker — Kensington Market
- Cumbrae's — Church-Wellesley / multiple
- The Healthy Butcher — Trinity Bellwoods
- Rowe Farms — multiple (Leslieville, etc.)
- Olliffe — Rosedale / Summerhill
- White House Meats — St. Lawrence Market
- The Butcher Shoppe — Liberty Village area
- Meat N' Potatoes — Etobicoke
- Royal Beef — Danforth/Greektown
- European Quality Meats — Kensington
- Nosso Talho / local Portuguese butchers — Little Portugal / Ossington
- Florence Meat Market — The Kingsway
- St. Lawrence Market vendors (curate 2–3 standout stalls)

> Aim for **20–25 published butchers**. This is a *candidate* list — Fable must
> confirm each is open and independent (exclude chains/grocery counters) before
> publishing.

**Reviews (live, not stored):** Place Details returns up to 5 reviews. Fetch on
demand in the detail route (§6), cache with `revalidate` (e.g. 24h). Never write
review text to Supabase.

---

## 5. Routes & app structure

```
app/
  layout.tsx                 # root layout, Tailwind, fonts
  page.tsx                   # MAP VIEW (server shell) -> renders <MapExplorer/>
  butcher/[slug]/page.tsx    # detail page (server component, fetches butcher)
  api/
    butchers/route.ts        # GET list w/ filters (neighborhood, minRating, specialty, q)
    butchers/[id]/reviews/route.ts  # GET live Google reviews (cached)
components/
  map/MapExplorer.tsx        # 'use client' Mapbox map + pins + slide-out card
  map/ButcherPin.tsx
  map/ButcherCard.tsx        # slide-out: name, address, hours, rating, 2-3 reviews, CTA
  detail/ButcherHeader.tsx
  detail/ReviewList.tsx      # renders live reviews from /api/.../reviews
  detail/InteriorViewer.tsx  # MVP: photo gallery + Street View embed (splat-ready)
  filters/FilterBar.tsx      # neighborhood / rating / specialty / open-now / search
lib/
  supabase/server.ts         # server client (service role for ingestion, anon for reads)
  supabase/client.ts         # browser client (anon)
  google/places.ts           # Places API helpers (server only)
  types.ts                   # Butcher, Media, Review types
store/
  useMapStore.ts             # Zustand: selectedButcherId, filters, viewport
scripts/
  seed.ts
supabase/migrations/0001_init.sql
```

### Data-flow rules
- **Reads** (map list, detail): server components / route handlers using the
  **anon** key (RLS-protected). Fast, cacheable.
- **Writes** (seed/ingestion): `scripts/seed.ts` only, **service role** key,
  never shipped to the client.
- Map component is `'use client'`; it fetches the butcher list from
  `/api/butchers` (or receives it as a prop from the server page for the initial
  load, then filters client-side).

### `InteriorViewer` contract (keep splat-ready)
```ts
type InteriorViewerProps = {
  butcherId: string;
  media: Media[];               // photos + optional streetview
  // future: splatUrl?: string  // drop-in for @mkkellogg/gaussian-splats-3d
};
```
MVP renders a swipeable photo gallery + optional Street View iframe. Callers must
not assume splats.

---

## 6. Key endpoint contracts

**`GET /api/butchers`** → published butchers for the map.
Query params: `neighborhood`, `minRating`, `specialty` (repeatable), `q`,
`openNow`. Returns `{ id, slug, name, lat, lng, neighborhood, google_rating,
google_review_count, specialty, address }[]`. Server-filter in SQL; keep payload
lean (no media/reviews) for fast map load. Set
`Cache-Control: s-maxage=300, stale-while-revalidate`.

**`GET /api/butchers/[id]/reviews`** → live Google reviews.
Reads `google_place_id` from Supabase, calls Place Details, returns up to 5
`{ authorName, rating, text, relativeTime, profilePhotoUrl }`. Use
`export const revalidate = 86400`. On Google error, return `{ reviews: [] }`
gracefully (never 500 the page).

---

## 7. Frontend behavior

**Map view (`/`)**
- Mapbox centered on Toronto (~`[-79.38, 43.68]`, zoom ~11).
- One pin per published butcher; cluster if needed.
- Click pin → slide-out `ButcherCard`: name, address, hours (open/closed now),
  star rating + count, 2–3 review snippets (from reviews endpoint), **"View
  Interior"** CTA → `/butcher/[slug]`.
- `FilterBar`: neighborhood dropdown, rating (4.5+/4+/3.5+), specialty chips,
  "open now" toggle, text search. Filtering updates visible pins.

**Detail page (`/butcher/[slug]`)**
- Full info + full review list (live, up to 5) + `InteriorViewer` (gallery/360).
- "Related butchers" = same neighborhood or nearest by lat/lng.

**Performance targets:** map interactive < 3s; detail < 2s. Lazy-load the
viewer/gallery. Mobile-responsive (map + bottom-sheet card on small screens).

---

## 8. Deployment / CI-CD

1. Push repo to GitHub (James provides).
2. Import into Vercel; set all env vars (§2) for Production + Preview.
3. Every PR → Vercel Preview URL. `main` → Production.
4. Supabase migrations applied via Supabase CLI (`supabase db push`) or the
   dashboard SQL editor for `0001_init.sql`; run `scripts/seed.ts` once locally
   against the project.
5. Add `vercel.json` only if needed (none required for MVP).

**Deploy checklist**
- [ ] `0001_init.sql` applied; RLS policies verified (anon can read, not write).
- [ ] Seed run; ≥20 published butchers with lat/lng + rating.
- [ ] Env vars set in Vercel (service role NOT exposed to client).
- [ ] Mapbox token restricted to the deployed domain.
- [ ] Google API key restricted (HTTP referrers / server IP; Places+Geocoding only).
- [ ] Map loads < 3s; reviews endpoint returns live data; mobile layout verified.

---

## 9. Milestones & acceptance

**M1 — Foundation:** Next.js + Tailwind + Supabase clients; `0001_init.sql`
applied; `scripts/seed.ts` populates ≥20 butchers. *Done when:* `select` from
`butchers` returns published rows with coords + ratings.

**M2 — Map:** `MapExplorer` renders pins from `/api/butchers`; click → card with
rating + snippets + CTA. *Done when:* all butchers appear and cards open.

**M3 — Detail + reviews + viewer:** detail page with live reviews and interior
gallery/360. *Done when:* reviews load live (≤5, not from DB) and gallery works.

**M4 — Filters + polish + deploy:** filters/search working; responsive; deployed
to Vercel. *Done when:* deploy checklist passes.

---

## 10. Explicit non-goals (MVP)
- No Gaussian splat generation or Fable-5 splat integration.
- No storing Google review text in Supabase.
- No async job queue / Vercel Workflow / multi-service backend.
- No user auth / uploads (curated media only).

## 11. Post-MVP (later)
- **3D interiors — deferred, decided approach:** use **`lingbot-map`**
  (`Robbyant/lingbot-map`) as the offline capture/processing tool. It's a
  Python + PyTorch 2.8 + **CUDA 12.8 GPU** model that reconstructs a scene from a
  **walkthrough video** and outputs **point clouds** (`.npz`) — *not* gaussian
  splats. It **cannot run on Vercel**; run it on a GPU host (local box, or Modal/
  RunPod/Replicate) as a one-time-per-shop batch job. Consume the output behind
  the existing `InteriorViewer` interface:
  - **Phase 2a (recommended first):** export lingbot's **MP4 flythrough** per
    shop → Supabase Storage → embed `<video>` in `InteriorViewer`. Simple, fast,
    mobile-friendly, no WebGL.
  - **Phase 2b (interactive upgrade):** export a **decimated `.ply`** point cloud
    → render in-browser with a Three.js point-cloud viewer for rotate/zoom/pan.
  - Alternative if true gaussian-splat *look* is wanted instead of point clouds:
    capture with Polycam/Scaniverse → `.splat` → `@mkkellogg/gaussian-splats-3d`.
  - The app itself stays GPU-free; 3D is always a pre-baked artifact.
- Scheduled re-sync of `google_rating`/`google_review_count` (Vercel Cron).
