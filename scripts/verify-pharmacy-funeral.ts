import "./env";
import { closeSql,getSql } from "@/db/connection";

async function main(){
 const sql=getSql();
 const facilities=await sql`SELECT facility_type,count(*)::int AS total,
  count(*) FILTER(WHERE business_status='OPEN')::int AS open,
  count(*) FILTER(WHERE business_status='CLOSED')::int AS closed,
  count(*) FILTER(WHERE business_status='TEMP_CLOSED')::int AS temp_closed,
  count(*) FILTER(WHERE business_status='SUSPENDED')::int AS suspended,
  count(*) FILTER(WHERE region_status='MATCHED')::int AS region_mapped,
  count(*) FILTER(WHERE region_status<>'MATCHED')::int AS region_review,
  count(*) FILTER(WHERE geo_status='VALID')::int AS coordinate_valid,
  count(*) FILTER(WHERE geo_status='MISSING')::int AS coordinate_missing,
  count(*) FILTER(WHERE geo_status IN ('INVALID','REVIEW_REQUIRED'))::int AS coordinate_invalid,
  count(*) FILTER(WHERE location IS NOT NULL)::int AS location_count
  FROM facilities WHERE facility_type IN ('ANIMAL_PHARMACY','PET_FUNERAL') GROUP BY facility_type ORDER BY facility_type`;
 const raw=await sql`SELECT source_type,count(*)::int AS raw_versions,count(DISTINCT external_id)::int AS source_ids,
  count(*) FILTER(WHERE processing_status='HELD_ANOMALY' AND processing_error='DUPLICATE_REVIEW_REQUIRED')::int AS review_required
  FROM source_raw_records WHERE source_type IN ('MOIS_ANIMAL_PHARMACY','MOIS_PET_FUNERAL') GROUP BY source_type ORDER BY source_type`;
 const runs=await sql`SELECT id,source_type,status,received_count,created_count,updated_count,unchanged_count,failed_count,
  extract(epoch FROM finished_at-started_at)::numeric(10,1) AS duration_seconds
  FROM sync_runs WHERE id IN ('b49a84db-5392-4675-856c-ddac25e7090e','61883306-cc72-40e3-96ac-43d3a414c41f') ORDER BY source_type`;
 const batches=await sql`SELECT r.source_type,b.status,count(*)::int AS batches,sum(b.last_row-b.first_row+1)::int AS rows
  FROM sync_batches b JOIN sync_runs r ON r.id=b.sync_run_id WHERE r.id IN ('b49a84db-5392-4675-856c-ddac25e7090e','61883306-cc72-40e3-96ac-43d3a414c41f') GROUP BY r.source_type,b.status ORDER BY r.source_type,b.status`;
 const nearby=await sql`WITH hospital AS (
  SELECT id,name,location FROM facilities WHERE facility_type='ANIMAL_HOSPITAL' AND business_status='OPEN' AND location IS NOT NULL ORDER BY id LIMIT 1
 ) SELECT h.id AS hospital_id,h.name AS hospital_name,p.id AS pharmacy_id,p.name AS pharmacy_name,
  round(ST_Distance(h.location,p.location))::int AS distance_meters
  FROM hospital h JOIN LATERAL (SELECT * FROM facilities p WHERE p.facility_type='ANIMAL_PHARMACY' AND p.business_status='OPEN' AND p.is_active AND p.location IS NOT NULL AND ST_DWithin(h.location,p.location,10000) ORDER BY ST_Distance(h.location,p.location) LIMIT 2) p ON true`;
 const features=await sql`SELECT f.facility_type,count(*) FILTER(WHERE ff.open_24h='UNKNOWN' AND ff.night_service='UNKNOWN' AND ff.exotic_service='UNKNOWN' AND ff.parking_available='UNKNOWN')::int AS all_unknown,count(*)::int AS total FROM facilities f JOIN facility_features ff ON ff.facility_id=f.id WHERE f.facility_type IN ('ANIMAL_PHARMACY','PET_FUNERAL') GROUP BY f.facility_type ORDER BY f.facility_type`;
 const adminSummary=await sql`SELECT f.facility_type,count(*)::int AS total,
  count(*) FILTER(WHERE f.business_status='OPEN')::int AS open,
  count(*) FILTER(WHERE f.business_status='CLOSED')::int AS closed,
  count(*) FILTER(WHERE f.geo_status='MISSING')::int AS coordinate_missing,
  count(*) FILTER(WHERE f.region_status<>'MATCHED')::int AS region_error,
  (SELECT count(*)::int FROM facility_duplicate_reviews d WHERE d.decision='REVIEW_REQUIRED' AND d.source_type=CASE f.facility_type WHEN 'ANIMAL_HOSPITAL' THEN 'MOIS_ANIMAL_HOSPITAL' WHEN 'ANIMAL_PHARMACY' THEN 'MOIS_ANIMAL_PHARMACY' ELSE 'MOIS_PET_FUNERAL' END) AS review_required
  FROM facilities f GROUP BY f.facility_type ORDER BY f.facility_type`;
 const reviewQueue=await sql`SELECT category,facility_type,count(*)::int AS count FROM (
  SELECT 'DUPLICATE'::text AS category,CASE d.source_type WHEN 'MOIS_ANIMAL_HOSPITAL' THEN 'ANIMAL_HOSPITAL' WHEN 'MOIS_ANIMAL_PHARMACY' THEN 'ANIMAL_PHARMACY' ELSE 'PET_FUNERAL' END AS facility_type
  FROM facility_duplicate_reviews d WHERE d.decision='REVIEW_REQUIRED'
  UNION ALL SELECT 'REGION',facility_type::text FROM facilities WHERE region_status<>'MATCHED'
  UNION ALL SELECT 'GEO',facility_type::text FROM facilities WHERE geo_status IN ('INVALID','REVIEW_REQUIRED')
  UNION ALL SELECT 'DATA_QUALITY',facility_type::text FROM facilities WHERE data_quality_score<50
 ) q GROUP BY category,facility_type ORDER BY category,facility_type`;
 console.log(JSON.stringify({facilities,raw,runs,batches,nearby,features,adminSummary,reviewQueue},null,2));
}
main().finally(closeSql);
