-- Per-review derived signal counts (never review text — Google ToS).
-- Each monthly score run archives the lexicon hit-counts of the ~5 reviews
-- Google exposes; scoring combines live reviews with archived signals from
-- the past 30 days, so busy shops are scored on their full recent stream.
-- Applied 2026-07-04 via Supabase MCP.
create table review_signals (
  id           uuid primary key default gen_random_uuid(),
  butcher_id   uuid not null references butchers(id) on delete cascade,
  review_ref   text not null unique,  -- Places review resource name (identifier only)
  published_at timestamptz,
  rating       smallint,
  quality_pos  integer not null default 0,
  quality_neg  integer not null default 0,
  service_pos  integer not null default 0,
  service_neg  integer not null default 0,
  craft        integer not null default 0,
  captured_at  timestamptz not null default now()
);

create index review_signals_butcher_idx on review_signals (butcher_id, published_at desc);

-- Server-only table: RLS on, no public policies (service role bypasses).
alter table review_signals enable row level security;
