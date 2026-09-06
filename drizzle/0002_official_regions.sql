-- Additive official legal-dong region master. No region rows are deleted.
ALTER TABLE regions ADD COLUMN official_code text;
ALTER TABLE regions ADD COLUMN official_full_name text;
ALTER TABLE regions ADD COLUMN is_active boolean NOT NULL DEFAULT true;
ALTER TABLE regions ADD COLUMN abolished_at date;
ALTER TABLE regions ADD COLUMN source_updated_at timestamptz;
ALTER TABLE regions ADD CONSTRAINT regions_official_code_uq UNIQUE (official_code);

CREATE TABLE region_aliases (
 id serial PRIMARY KEY,
 region_id integer NOT NULL REFERENCES regions(id),
 alias_name text NOT NULL,
 alias_slug text NOT NULL UNIQUE,
 redirect_status integer NOT NULL DEFAULT 308 CHECK (redirect_status IN (301, 308)),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX region_aliases_region_idx ON region_aliases(region_id);
ALTER TABLE region_aliases ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON TABLE region_aliases FROM anon; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON TABLE region_aliases FROM authenticated; END IF;
END $$;
