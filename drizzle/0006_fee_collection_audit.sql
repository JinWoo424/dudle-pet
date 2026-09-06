-- Additive audit fields. No table/data deletion, no changes to existing prices.
ALTER TABLE fee_import_batches ADD COLUMN IF NOT EXISTS started_at timestamptz;
ALTER TABLE fee_import_batches ADD COLUMN IF NOT EXISTS finished_at timestamptz;
ALTER TABLE fee_import_batches ADD COLUMN IF NOT EXISTS request_count integer NOT NULL DEFAULT 0;
ALTER TABLE fee_import_batches ADD COLUMN IF NOT EXISTS review_count integer NOT NULL DEFAULT 0;
-- Keep the existing region status constraint: REVIEW_REQUIRED rows are retained
-- as HISTORICAL_ONLY (no current_region_id) with explicit batch/crosswalk audit.
