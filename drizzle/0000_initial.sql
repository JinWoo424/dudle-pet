CREATE EXTENSION IF NOT EXISTS postgis;

DO $$ BEGIN CREATE TYPE region_level AS ENUM ('PROVINCE','CITY','DISTRICT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE facility_type AS ENUM ('ANIMAL_HOSPITAL','ANIMAL_PHARMACY','PET_FUNERAL','PET_GROOMING','PET_BOARDING','PET_TRANSPORT','PET_CAFE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE business_status AS ENUM ('OPEN','CLOSED','TEMP_CLOSED','SUSPENDED','UNKNOWN'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE geo_status AS ENUM ('VALID','MISSING','INVALID','REVIEW_REQUIRED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE region_status AS ENUM ('MATCHED','UNMATCHED','REVIEW_REQUIRED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE tri_state AS ENUM ('YES','NO','UNKNOWN'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE verification_status AS ENUM ('VALID','EXPIRING','EXPIRED','UNVERIFIED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE verification_source AS ENUM ('PUBLIC_DATA','OFFICIAL_WEBSITE','OFFICIAL_SOCIAL','PHONE_CONFIRMATION','KAKAO_PLACE','NAVER_PLACE','ADMIN_MANUAL','USER_REPORT_CONFIRMED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE processing_status AS ENUM ('PENDING','PROCESSED','FAILED','HELD_ANOMALY'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE sync_status AS ENUM ('RUNNING','SUCCESS','PARTIAL','FAILED','BLOCKED_ANOMALY'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE report_type AS ENUM ('CLOSED','WRONG_PHONE','WRONG_ADDRESS','WRONG_HOURS','WRONG_24H','WRONG_SERVICE','OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE report_status AS ENUM ('NEW','UNDER_REVIEW','RESOLVED','REJECTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE seo_status AS ENUM ('SEO_READY','NOINDEX_LOW_DATA','NOINDEX_DUPLICATE','NOINDEX_MANUAL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE monetization_status AS ENUM ('FULL','LIMITED','OFF'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE guide_status AS ENUM ('DRAFT','PUBLISHED','ARCHIVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE fee_region_level AS ENUM ('NATIONAL','PROVINCE','CITY'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE animal_type AS ENUM ('DOG','CAT','ALL','NOT_APPLICABLE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE weight_class AS ENUM ('KG_5','KG_10','KG_20','NOT_APPLICABLE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS regions (
 id serial PRIMARY KEY, parent_id integer REFERENCES regions(id), level region_level NOT NULL, name text NOT NULL, short_name text NOT NULL, slug text NOT NULL, full_slug text NOT NULL UNIQUE,
 province_code text, city_code text, center_latitude real, center_longitude real, hospital_count integer NOT NULL DEFAULT 0, pharmacy_count integer NOT NULL DEFAULT 0,
 funeral_count integer NOT NULL DEFAULT 0, active_facility_count integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS facilities (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), facility_type facility_type NOT NULL, public_source text NOT NULL, public_source_id text NOT NULL, public_local_code text,
 name text NOT NULL, normalized_name text NOT NULL, phone_raw text, phone_normalized text, road_address text, jibun_address text, postal_code text, region_id integer REFERENCES regions(id),
 province text, city text, district text, legal_dong text, public_status_code text, public_status_name text, public_detail_status_code text, public_detail_status_name text,
 business_status business_status NOT NULL DEFAULT 'UNKNOWN', license_date date, license_cancel_date date, closed_date date, temporary_close_start date, temporary_close_end date, reopen_date date,
 source_x text, source_y text, source_crs text DEFAULT 'EPSG:5174', latitude real, longitude real, location geography(Point,4326), geo_status geo_status NOT NULL DEFAULT 'MISSING',
 region_status region_status NOT NULL DEFAULT 'UNMATCHED', source_updated_at timestamptz, last_synced_at timestamptz, data_quality_score integer NOT NULL DEFAULT 0,
 missing_streak integer NOT NULL DEFAULT 0, is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(public_source, public_source_id)
);
CREATE TABLE IF NOT EXISTS facility_features (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), facility_id uuid NOT NULL UNIQUE REFERENCES facilities(id) ON DELETE CASCADE, open_24h tri_state NOT NULL DEFAULT 'UNKNOWN',
 night_service tri_state NOT NULL DEFAULT 'UNKNOWN', emergency_service tri_state NOT NULL DEFAULT 'UNKNOWN', dog_service tri_state NOT NULL DEFAULT 'UNKNOWN', cat_service tri_state NOT NULL DEFAULT 'UNKNOWN',
 rabbit_service tri_state NOT NULL DEFAULT 'UNKNOWN', hamster_service tri_state NOT NULL DEFAULT 'UNKNOWN', bird_service tri_state NOT NULL DEFAULT 'UNKNOWN', reptile_service tri_state NOT NULL DEFAULT 'UNKNOWN',
 exotic_service tri_state NOT NULL DEFAULT 'UNKNOWN', parking_available tri_state NOT NULL DEFAULT 'UNKNOWN', ct_available tri_state NOT NULL DEFAULT 'UNKNOWN', mri_available tri_state NOT NULL DEFAULT 'UNKNOWN',
 homepage_url text, reservation_url text, verification_status verification_status NOT NULL DEFAULT 'UNVERIFIED', verified_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS facility_verifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), facility_id uuid NOT NULL REFERENCES facilities(id) ON DELETE CASCADE, field_name text NOT NULL, field_value text NOT NULL,
 source_type verification_source NOT NULL, source_url text, evidence_note text, verified_at timestamptz NOT NULL, verified_by text, expires_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS facility_hours (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), facility_id uuid NOT NULL REFERENCES facilities(id) ON DELETE CASCADE, day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
 open_time time, close_time time, break_start time, break_end time, is_24h boolean NOT NULL DEFAULT false, is_closed boolean NOT NULL DEFAULT false,
 source_type verification_source NOT NULL, verified_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(facility_id, day_of_week)
);
CREATE TABLE IF NOT EXISTS source_raw_records (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), source_type text NOT NULL, facility_type facility_type NOT NULL, external_id text NOT NULL, payload_json jsonb NOT NULL,
 source_updated_at timestamptz, fetched_at timestamptz NOT NULL DEFAULT now(), checksum text NOT NULL, processing_status processing_status NOT NULL DEFAULT 'PENDING', processing_error text,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(source_type, external_id, checksum)
);
CREATE TABLE IF NOT EXISTS sync_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), source_type text NOT NULL, started_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz, status sync_status NOT NULL DEFAULT 'RUNNING',
 requested_count integer NOT NULL DEFAULT 0, received_count integer NOT NULL DEFAULT 0, created_count integer NOT NULL DEFAULT 0, updated_count integer NOT NULL DEFAULT 0,
 unchanged_count integer NOT NULL DEFAULT 0, failed_count integer NOT NULL DEFAULT 0, error_message text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS facility_changes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), facility_id uuid NOT NULL REFERENCES facilities(id), field_name text NOT NULL, old_value text, new_value text,
 source_type text NOT NULL, detected_at timestamptz NOT NULL DEFAULT now(), reviewed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS fee_import_batches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), survey_year integer NOT NULL, source_name text NOT NULL, source_url text, file_name text NOT NULL, file_hash text NOT NULL,
 imported_at timestamptz NOT NULL DEFAULT now(), imported_by text NOT NULL, row_count integer NOT NULL DEFAULT 0, success_count integer NOT NULL DEFAULT 0,
 failed_count integer NOT NULL DEFAULT 0, status text NOT NULL, notes text
);
CREATE TABLE IF NOT EXISTS medical_fee_statistics (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), survey_year integer NOT NULL, region_level fee_region_level NOT NULL, region_id integer REFERENCES regions(id), province text, city text,
 category_code text NOT NULL, item_code text NOT NULL, item_name text NOT NULL, animal_type animal_type NOT NULL DEFAULT 'NOT_APPLICABLE', weight_class weight_class NOT NULL DEFAULT 'NOT_APPLICABLE',
 unit text NOT NULL DEFAULT '원', minimum_price integer, median_price integer, average_price integer, maximum_price integer, sample_count integer, source_name text NOT NULL,
 source_url text, source_date date, import_batch_id uuid REFERENCES fee_import_batches(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(survey_year, region_level, region_id, item_code, animal_type, weight_class)
);
CREATE TABLE IF NOT EXISTS user_reports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), facility_id uuid NOT NULL REFERENCES facilities(id), report_type report_type NOT NULL, message text NOT NULL, contact_email text,
 status report_status NOT NULL DEFAULT 'NEW', admin_note text, created_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz
);
CREATE TABLE IF NOT EXISTS seo_pages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), page_type text NOT NULL, facility_type facility_type, region_id integer REFERENCES regions(id), feature_type text,
 result_count integer NOT NULL DEFAULT 0, page_quality_score integer NOT NULL DEFAULT 0, seo_status seo_status NOT NULL DEFAULT 'NOINDEX_LOW_DATA',
 monetization_status monetization_status NOT NULL DEFAULT 'OFF', canonical_url text NOT NULL UNIQUE, generated_at timestamptz NOT NULL DEFAULT now(), last_evaluated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS guides (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, slug text NOT NULL UNIQUE, summary text NOT NULL, body text NOT NULL, category text NOT NULL,
 status guide_status NOT NULL DEFAULT 'DRAFT', seo_title text, seo_description text, published_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS admin_audit_logs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), admin text NOT NULL, action text NOT NULL, entity_type text NOT NULL, entity_id text NOT NULL,
 before_json jsonb, after_json jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS seo_keyword_metrics (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), keyword text NOT NULL, page_type text NOT NULL, region_id integer REFERENCES regions(id), search_volume integer,
 cpc integer, competition real, impressions bigint, clicks bigint, ctr real, position real, adsense_rpm integer, opportunity_score real, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS regions_parent_idx ON regions(parent_id);
CREATE INDEX IF NOT EXISTS facilities_location_gist_idx ON facilities USING GIST(location);
CREATE INDEX IF NOT EXISTS facilities_region_type_idx ON facilities(region_id, facility_type, is_active);
CREATE INDEX IF NOT EXISTS facilities_normalized_name_idx ON facilities(normalized_name);
CREATE INDEX IF NOT EXISTS facility_verifications_facility_idx ON facility_verifications(facility_id, field_name);
