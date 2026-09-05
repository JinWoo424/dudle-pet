-- Run through scripts/migrate.ts. No facility seed or destructive reset.
CREATE INDEX IF NOT EXISTS facilities_type_idx ON facilities(facility_type);
CREATE INDEX IF NOT EXISTS facilities_status_idx ON facilities(business_status);
CREATE INDEX IF NOT EXISTS facilities_region_idx ON facilities(region_id);
CREATE INDEX IF NOT EXISTS facilities_province_idx ON facilities(province);
CREATE INDEX IF NOT EXISTS facilities_city_idx ON facilities(city);
CREATE INDEX IF NOT EXISTS facilities_active_idx ON facilities(is_active);
CREATE INDEX IF NOT EXISTS verification_latest_idx ON facility_verifications(facility_id,field_name,verified_at DESC,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS reports_status_created_idx ON user_reports(status,created_at DESC);
CREATE INDEX IF NOT EXISTS sync_source_started_idx ON sync_runs(source_type,started_at DESC);
CREATE INDEX IF NOT EXISTS seo_status_canonical_idx ON seo_pages(seo_status,canonical_url);

CREATE OR REPLACE FUNCTION set_facility_location() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.geo_status='VALID' AND NEW.latitude BETWEEN 32 AND 39 AND NEW.longitude BETWEEN 124 AND 132 THEN
  NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude,NEW.latitude),4326)::geography;
 ELSE
  NEW.location := NULL;
  IF NEW.geo_status='VALID' THEN NEW.geo_status := 'REVIEW_REQUIRED'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER facilities_location_before_write BEFORE INSERT OR UPDATE OF latitude,longitude,geo_status
ON facilities FOR EACH ROW EXECUTE FUNCTION set_facility_location();
UPDATE facilities SET geo_status=geo_status;

-- Choose latest evidence first, then check validity. Expired recent evidence must
-- never revive an older YES. This view is only accessible to the server role.
CREATE VIEW current_facility_verifications WITH (security_invoker=true) AS
SELECT * FROM (
 SELECT DISTINCT ON (facility_id,field_name) *
 FROM facility_verifications WHERE verified_at<=now()
 ORDER BY facility_id,field_name,verified_at DESC,created_at DESC,id DESC
) latest
WHERE expires_at>now()
 AND (nullif(trim(source_url),'') IS NOT NULL OR nullif(trim(evidence_note),'') IS NOT NULL);

CREATE TABLE request_rate_limits (
 key_hash text NOT NULL, bucket bigint NOT NULL, attempts integer NOT NULL DEFAULT 1,
 expires_at timestamptz NOT NULL, PRIMARY KEY(key_hash,bucket)
);
CREATE INDEX request_rate_limits_expiry_idx ON request_rate_limits(expires_at);
CREATE TABLE sync_source_snapshots (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), source_type text NOT NULL,
 sync_run_id uuid NOT NULL REFERENCES sync_runs(id), record_count integer NOT NULL,
 complete boolean NOT NULL DEFAULT false, contract_checksum text NOT NULL, approved_at timestamptz, approved_by text,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE facility_source_presence (
 facility_id uuid PRIMARY KEY REFERENCES facilities(id), source_type text NOT NULL,
 last_snapshot_id uuid REFERENCES sync_source_snapshots(id),
 missing_streak integer NOT NULL DEFAULT 0, last_seen_at timestamptz
);
ALTER TABLE seo_pages ADD COLUMN manual_hold boolean NOT NULL DEFAULT false;
ALTER TABLE seo_pages ADD COLUMN low_data_since timestamptz;

-- All access is server-side. Supabase anon/authenticated must not read or mutate
-- operational/private tables through the automatically exposed Data API.
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['regions','facilities','facility_features','facility_verifications','facility_hours',
 'source_raw_records','sync_runs','facility_changes','user_reports','seo_pages','admin_audit_logs',
 'fee_import_batches','medical_fee_statistics','guides','seo_keyword_metrics',
 'request_rate_limits','sync_source_snapshots','facility_source_presence'] LOOP
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN EXECUTE format('REVOKE ALL ON TABLE %I FROM anon',t); END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN EXECUTE format('REVOKE ALL ON TABLE %I FROM authenticated',t); END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON current_facility_verifications FROM anon; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON current_facility_verifications FROM authenticated; END IF;
END $$;
