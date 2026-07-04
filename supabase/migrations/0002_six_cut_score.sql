-- The Six Cut Score: derived /10 score + component breakdown (methodology in
-- lib/scoring.ts, published at /methodology). Raw review text is never stored.
alter table butchers
  add column six_cut_score numeric(3,1),
  add column six_cut_breakdown jsonb,
  add column six_cut_scored_at timestamptz;

create index butchers_six_cut_score_idx on butchers (six_cut_score desc nulls last);
