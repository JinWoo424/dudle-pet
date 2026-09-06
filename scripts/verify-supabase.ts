import "./env";
import { readFileSync } from "node:fs";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  const caPath = process.env.SUPABASE_CA_CERT_PATH;
  if (!url || !caPath) throw new Error("CONFIGURATION_MISSING");
  const sql = postgres(url, {
    max: 1, prepare: false, connect_timeout: 10,
    ssl: { ca: readFileSync(caPath, "utf8"), rejectUnauthorized: true, servername: new URL(url).hostname },
    onnotice: () => {},
  });
  try {
    await sql.begin(async tx => {
      await tx`SET TRANSACTION READ ONLY`;
      await tx`SET LOCAL search_path = public, extensions`;
      await tx`SET LOCAL statement_timeout = '10s'`;
      const tables = await tx`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`;
      const expected = ['regions','facilities','facility_features','facility_verifications','facility_hours','source_raw_records','sync_runs','facility_changes','user_reports','seo_pages','admin_audit_logs','fee_import_batches','medical_fee_statistics'];
      const missing = expected.filter(name => !tables.some(t => t.tablename === name));
      const extensions = await tx`SELECT extname,extversion FROM pg_extension WHERE extname='postgis'`;
      const column = await tx`SELECT format_type(a.atttypid,a.atttypmod) AS type FROM pg_attribute a WHERE a.attrelid='public.facilities'::regclass AND a.attname='location' AND NOT a.attisdropped`;
      const indexes = await tx`SELECT indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND tablename='facilities' ORDER BY indexname`;
      const spatial = await tx`SELECT i.indisvalid,i.indisready FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid WHERE c.oid='public.facilities_location_gist_idx'::regclass`;
      const migrations = await tx`SELECT name FROM public.schema_migrations ORDER BY name`;
      // One real PostGIS distance query using constants, with no fixture writes.
      const distance = await tx`SELECT ST_Distance(ST_SetSRID(ST_MakePoint(127,37.5),4326)::geography,ST_SetSRID(ST_MakePoint(127.001,37.5),4326)::geography) AS meters`;
      const distanceMeters = Number(distance[0]?.meters);
      const passed = missing.length === 0 && extensions.length === 1 && column[0]?.type === 'geography(Point,4326)' && indexes.some(i => /USING gist \(location\)/i.test(i.indexdef)) && spatial[0]?.indisvalid === true && spatial[0]?.indisready === true && distanceMeters > 80 && distanceMeters < 100 && migrations.length === 2;
      console.log(JSON.stringify({status:passed?'VERIFIED':'FAILED',tables,missing,extensions,column,indexes,spatial,migrations,distanceMeters}));
      if (!passed) process.exitCode = 1;
    });
  } finally { await sql.end({ timeout: 2 }); }
}
main().catch(() => { console.log(JSON.stringify({status:'VERIFICATION_FAILED'})); process.exitCode = 1; });
