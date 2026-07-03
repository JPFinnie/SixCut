-- The Six Cut — initial schema (PLAN.md §3)
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
  id           uuid primary key default gen_random_uuid(),
  butcher_id   uuid not null references butchers(id) on delete cascade,
  kind         text not null default 'photo',             -- 'photo' | 'streetview' | 'splat'(future)
  url          text not null,
  storage_path text,                                      -- Supabase Storage path if uploaded
  source       text,                                      -- 'manual' | 'google_places' | 'upload'
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

-- Indexes for map/list performance
create index butchers_published_idx    on butchers (is_published);
create index butchers_rating_idx       on butchers (google_rating desc);
create index butchers_neighborhood_idx on butchers (neighborhood);
create index butchers_specialty_gin    on butchers using gin (specialty);
create index butchers_geo_idx          on butchers (lat, lng);
create index media_butcher_idx         on media (butcher_id, sort_order);

-- RLS: public read of published data, writes via service role only
alter table butchers enable row level security;
alter table media    enable row level security;

create policy "public read published butchers"
  on butchers for select using (is_published = true);
create policy "public read media"
  on media for select using (true);
-- (No public insert/update/delete policies: service role bypasses RLS for ingestion.)
