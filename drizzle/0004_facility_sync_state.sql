-- Additive sync-state tracking. Missing source rows remain active and are not
-- interpreted as closure.
ALTER TABLE facility_source_presence
  ADD COLUMN IF NOT EXISTS current_state text NOT NULL DEFAULT 'UNCHANGED',
  ADD COLUMN IF NOT EXISTS last_transition_at timestamptz NOT NULL DEFAULT now();

DO $$ BEGIN
 ALTER TABLE facility_source_presence ADD CONSTRAINT facility_source_presence_state_check
  CHECK (current_state IN ('NEW','UPDATED','UNCHANGED','MISSING_FROM_SOURCE','CLOSED','REOPENED','REVIEW_REQUIRED'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
