-- Additive/versioning-only migration. Existing fee rows remain available.
ALTER TABLE medical_fee_statistics ADD COLUMN IF NOT EXISTS survey_region_code text;
ALTER TABLE medical_fee_statistics ADD COLUMN IF NOT EXISTS survey_province_name text;
ALTER TABLE medical_fee_statistics ADD COLUMN IF NOT EXISTS survey_city_name text;
ALTER TABLE medical_fee_statistics ADD COLUMN IF NOT EXISTS current_region_id integer REFERENCES regions(id);
ALTER TABLE medical_fee_statistics ADD COLUMN IF NOT EXISTS region_match_status text NOT NULL DEFAULT 'HISTORICAL_ONLY';
ALTER TABLE fee_import_batches ADD COLUMN IF NOT EXISTS rolled_back_at timestamptz;
ALTER TABLE fee_import_batches ADD COLUMN IF NOT EXISTS rolled_back_by text;

UPDATE medical_fee_statistics SET survey_province_name=coalesce(survey_province_name,province),survey_city_name=coalesce(survey_city_name,city),current_region_id=coalesce(current_region_id,region_id),region_match_status=CASE WHEN region_id IS NULL AND region_level='NATIONAL' THEN 'NOT_APPLICABLE' WHEN region_id IS NOT NULL THEN 'MATCHED' ELSE 'HISTORICAL_ONLY' END;

ALTER TABLE medical_fee_statistics DROP CONSTRAINT IF EXISTS medical_fee_statistics_survey_year_region_level_region_id_item_key;
DROP INDEX IF EXISTS fee_stats_dimension_uq;
CREATE UNIQUE INDEX fee_stats_batch_dimension_uq ON medical_fee_statistics(import_batch_id,region_level,coalesce(survey_region_code,''),coalesce(survey_province_name,''),coalesce(survey_city_name,''),item_code,animal_type,weight_class);
CREATE INDEX medical_fee_current_region_idx ON medical_fee_statistics(current_region_id,item_code,survey_year);
CREATE INDEX fee_import_active_idx ON fee_import_batches(status,survey_year,imported_at DESC);

ALTER TABLE medical_fee_statistics DROP CONSTRAINT IF EXISTS medical_fee_region_match_status_ck;
ALTER TABLE medical_fee_statistics ADD CONSTRAINT medical_fee_region_match_status_ck CHECK(region_match_status IN ('MATCHED','HISTORICAL_ONLY','NOT_APPLICABLE'));

DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON medical_fee_statistics,fee_import_batches FROM anon; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON medical_fee_statistics,fee_import_batches FROM authenticated; END IF;
END $$;
