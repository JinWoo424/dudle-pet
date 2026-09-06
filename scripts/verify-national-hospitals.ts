import "./env";
import { closeSql, getSql } from "@/db/connection";

async function main() {
  const sql = getSql();
  const [totals] = await sql<Array<Record<string, unknown>>>`
    SELECT count(*)::int AS facilities_total,
      count(*) FILTER(WHERE facility_type='ANIMAL_HOSPITAL')::int AS hospital_total,
      count(*) FILTER(WHERE facility_type='ANIMAL_HOSPITAL' AND business_status='OPEN')::int AS hospital_open,
      count(*) FILTER(WHERE facility_type='ANIMAL_HOSPITAL' AND business_status='CLOSED')::int AS hospital_closed,
      count(*) FILTER(WHERE facility_type='ANIMAL_HOSPITAL' AND business_status='TEMP_CLOSED')::int AS hospital_temp_closed,
      count(*) FILTER(WHERE facility_type='ANIMAL_HOSPITAL' AND business_status='SUSPENDED')::int AS hospital_suspended,
      count(*) FILTER(WHERE facility_type='ANIMAL_HOSPITAL' AND region_status<>'MATCHED')::int AS region_review,
      count(*) FILTER(WHERE facility_type='ANIMAL_HOSPITAL' AND geo_status='VALID')::int AS coordinates_valid,
      count(*) FILTER(WHERE facility_type='ANIMAL_HOSPITAL' AND geo_status='MISSING')::int AS coordinates_missing,
      count(*) FILTER(WHERE facility_type='ANIMAL_HOSPITAL' AND geo_status IN ('INVALID','REVIEW_REQUIRED'))::int AS coordinates_invalid,
      count(*) FILTER(WHERE facility_type='ANIMAL_HOSPITAL' AND location IS NOT NULL)::int AS postgis_locations
    FROM facilities`;
  const [raw] = await sql<Array<Record<string, unknown>>>`
    SELECT count(*)::int AS raw_versions,count(DISTINCT external_id)::int AS raw_source_ids,
      count(*) FILTER(WHERE processing_status='HELD_ANOMALY' AND processing_error='DUPLICATE_REVIEW_REQUIRED')::int AS duplicate_review_raw
    FROM source_raw_records WHERE source_type='MOIS_ANIMAL_HOSPITAL'`;
  const [run] = await sql<Array<Record<string, unknown>>>`
    SELECT id,status,received_count,created_count,updated_count,unchanged_count,failed_count,
      extract(epoch FROM finished_at-started_at)::numeric(10,1) AS duration_seconds
    FROM sync_runs WHERE id='6abb057e-6596-4015-9f43-7c41569a9e99'`;
  const batch = await sql<Array<Record<string, unknown>>>`
    SELECT status,count(*)::int AS count,sum(last_row-first_row+1)::int AS rows
    FROM sync_batches WHERE sync_run_id='6abb057e-6596-4015-9f43-7c41569a9e99' GROUP BY status ORDER BY status`;
  const states = await sql<Array<Record<string, unknown>>>`
    SELECT current_state,count(*)::int AS count FROM facility_source_presence
    WHERE source_type='MOIS_ANIMAL_HOSPITAL' GROUP BY current_state ORDER BY current_state`;
  const cityPatterns = [
    ["서울","seoul"],["부산","busan"],["여수","jeonnam-gwangju/yeosu"],["순천","jeonnam-gwangju/suncheon"],
    ["광주권","jeonnam-gwangju"],["대구","daegu"],["인천","incheon"],["대전","daejeon"],["울산","ulsan"],["제주","jeju"],
  ];
  const qa = [];
  for (const [label, slug] of cityPatterns) {
    const [row] = await sql<Array<Record<string, unknown>>>`
      SELECT count(*)::int AS open_count,
        count(*) FILTER(WHERE f.geo_status='VALID' AND f.location IS NOT NULL)::int AS markers,
        min(f.name) AS sample_name,min(coalesce(f.road_address,f.jibun_address)) AS sample_address,
        count(*) FILTER(WHERE f.phone_normalized IS NOT NULL)::int AS phone_count
      FROM facilities f JOIN regions r ON r.id=f.region_id
      WHERE f.facility_type='ANIMAL_HOSPITAL' AND f.is_active AND f.business_status='OPEN'
        AND (r.full_slug=${slug} OR starts_with(r.full_slug,${slug+'/' }))`;
    qa.push({label,slug,...row});
  }
  const [integrity] = await sql<Array<Record<string, unknown>>>`
    SELECT
      (SELECT count(*)::int FROM regions c WHERE c.is_active AND c.parent_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM regions p WHERE p.id=c.parent_id AND p.is_active)) AS orphan_regions,
      (SELECT count(*)::int FROM facilities f WHERE f.facility_type='ANIMAL_HOSPITAL' AND f.location IS NOT NULL AND f.geo_status<>'VALID') AS invalid_locations,
      (SELECT count(*)::int FROM facilities f WHERE f.facility_type='ANIMAL_HOSPITAL' AND f.public_source_id IS NULL) AS missing_source_ids`;
  console.log(JSON.stringify({totals,raw,run,batch,states,integrity,qa},null,2));
}

main().finally(closeSql);
