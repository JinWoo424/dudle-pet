-- Additive operational audit structures. No source or facility data is removed.
ALTER TABLE sync_source_snapshots
  ADD COLUMN IF NOT EXISTS baseline_metrics jsonb;

CREATE TABLE IF NOT EXISTS facility_duplicate_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_record_id uuid NOT NULL UNIQUE REFERENCES source_raw_records(id),
  source_type text NOT NULL,
  public_source_id text NOT NULL,
  candidate_public_source_id text,
  decision text NOT NULL CHECK (decision IN ('MERGE','KEEP_SEPARATE','REVIEW_REQUIRED')),
  reason_code text NOT NULL,
  review_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  reviewed_by text NOT NULL,
  reviewed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS facility_duplicate_reviews_source_idx
  ON facility_duplicate_reviews(source_type, decision, reviewed_at DESC);

CREATE TABLE IF NOT EXISTS sync_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_run_id uuid NOT NULL REFERENCES sync_runs(id),
  batch_number integer NOT NULL,
  first_row integer NOT NULL,
  last_row integer NOT NULL,
  status text NOT NULL CHECK (status IN ('RUNNING','SUCCESS','FAILED')),
  created_count integer NOT NULL DEFAULT 0,
  updated_count integer NOT NULL DEFAULT 0,
  unchanged_count integer NOT NULL DEFAULT 0,
  review_count integer NOT NULL DEFAULT 0,
  error_code text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  UNIQUE(sync_run_id, batch_number)
);

DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['facility_duplicate_reviews','sync_batches'] LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN EXECUTE format('REVOKE ALL ON TABLE %I FROM anon',t); END IF;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN EXECUTE format('REVOKE ALL ON TABLE %I FROM authenticated',t); END IF;
 END LOOP;
END $$;
