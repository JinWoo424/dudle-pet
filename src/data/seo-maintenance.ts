import { getSql } from "@/db/connection";
export async function refreshSeo(){
 const sql=getSql();const base=(process.env.NEXT_PUBLIC_SITE_URL||"https://pet.dudle.co.kr").replace(/\/$/,"");
 return sql.begin(async tx=>{
  // Re-evaluate from a fail-closed baseline so moved/empty pages cannot retain
  // obsolete SEO_READY entries. A failed transaction preserves the prior state.
  await tx`UPDATE seo_pages SET seo_status=CASE WHEN manual_hold THEN 'NOINDEX_MANUAL'::seo_status ELSE 'NOINDEX_LOW_DATA'::seo_status END,result_count=0,monetization_status='OFF',last_evaluated_at=now()`;
  // Refresh all regional counts in SQL, including descendants.
  await tx`WITH memberships AS MATERIALIZED (
    SELECT ancestor.id AS region_id,f.facility_type
    FROM facilities f JOIN regions leaf ON leaf.id=f.region_id
    JOIN regions ancestor ON ancestor.is_active AND (ancestor.id=leaf.id OR starts_with(leaf.full_slug,ancestor.full_slug||'/'))
    WHERE f.is_active AND f.business_status='OPEN'
   ), counts AS (
    SELECT region_id,count(*) FILTER(WHERE facility_type='ANIMAL_HOSPITAL')::int AS hospital_count,
      count(*) FILTER(WHERE facility_type='ANIMAL_PHARMACY')::int AS pharmacy_count,
      count(*) FILTER(WHERE facility_type='PET_FUNERAL')::int AS funeral_count
    FROM memberships GROUP BY region_id
   ) UPDATE regions r SET hospital_count=coalesce(c.hospital_count,0),pharmacy_count=coalesce(c.pharmacy_count,0),
     funeral_count=coalesce(c.funeral_count,0),updated_at=now() FROM (SELECT r2.id,counts.* FROM regions r2 LEFT JOIN counts ON counts.region_id=r2.id) c WHERE r.id=c.id`;
  await tx`UPDATE regions SET active_facility_count=hospital_count+pharmacy_count+funeral_count`;
  const evaluated=await tx`WITH variants(kind,path,page_type,feature,minimum) AS (VALUES
   ('ANIMAL_HOSPITAL','hospital','HOSPITAL_REGION',NULL::text,5),
   ('ANIMAL_PHARMACY','pharmacy','PHARMACY_REGION',NULL::text,5),
   ('PET_FUNERAL','funeral','FUNERAL_REGION',NULL::text,2),
   ('ANIMAL_HOSPITAL','hospital','HOSPITAL_24H','open_24h',2),
   ('ANIMAL_HOSPITAL','hospital','HOSPITAL_NIGHT','night_service',3),
   ('ANIMAL_HOSPITAL','hospital','HOSPITAL_EXOTIC','exotic_service',3)
  ), memberships AS MATERIALIZED (
   SELECT ancestor.id AS region_id,f.id,f.facility_type::text AS kind,f.data_quality_score
   FROM facilities f JOIN regions leaf ON leaf.id=f.region_id
   JOIN regions ancestor ON ancestor.is_active AND (ancestor.id=leaf.id OR starts_with(leaf.full_slug,ancestor.full_slug||'/'))
   WHERE f.is_active AND f.business_status='OPEN'
  ), calculated AS (
   SELECT r.id AS region_id,v.*,count(m.id) FILTER(WHERE v.feature IS NULL OR EXISTS(
      SELECT 1 FROM current_facility_verifications cv WHERE cv.facility_id=m.id AND cv.field_name=v.feature AND cv.field_value='YES'))::int AS total,
    COALESCE(avg(m.data_quality_score) FILTER(WHERE v.feature IS NULL OR EXISTS(
      SELECT 1 FROM current_facility_verifications cv WHERE cv.facility_id=m.id AND cv.field_name=v.feature AND cv.field_value='YES')),0)::int AS quality
   FROM regions r CROSS JOIN variants v LEFT JOIN memberships m ON m.region_id=r.id AND m.kind=v.kind
   WHERE r.is_active GROUP BY r.id,v.kind,v.path,v.page_type,v.feature,v.minimum
  )
  INSERT INTO seo_pages(page_type,facility_type,region_id,feature_type,result_count,page_quality_score,seo_status,monetization_status,canonical_url,low_data_since)
  SELECT c.page_type,c.kind::facility_type,c.region_id,c.feature,c.total,c.quality,
   CASE WHEN c.total>=c.minimum AND c.quality>=50 THEN 'SEO_READY'::seo_status ELSE 'NOINDEX_LOW_DATA'::seo_status END,
   'OFF'::monetization_status,${base}||'/'||c.path||'/'||r.full_slug||CASE c.feature WHEN 'open_24h' THEN '/24h' WHEN 'night_service' THEN '/night' WHEN 'exotic_service' THEN '/exotic' ELSE '' END,
   CASE WHEN c.total<c.minimum THEN now() ELSE NULL END
  FROM calculated c JOIN regions r ON r.id=c.region_id
  ON CONFLICT(canonical_url) DO UPDATE SET result_count=EXCLUDED.result_count,page_quality_score=EXCLUDED.page_quality_score,
   seo_status=CASE WHEN seo_pages.manual_hold THEN 'NOINDEX_MANUAL'::seo_status ELSE EXCLUDED.seo_status END,
   monetization_status='OFF',low_data_since=CASE WHEN EXCLUDED.seo_status='SEO_READY' THEN NULL ELSE coalesce(seo_pages.low_data_since,now()) END,last_evaluated_at=now()
  RETURNING id`;
  await tx`INSERT INTO seo_pages(page_type,facility_type,region_id,result_count,page_quality_score,seo_status,monetization_status,canonical_url)
   SELECT 'FACILITY_DETAIL',f.facility_type,f.region_id,1,f.data_quality_score,
    CASE WHEN f.is_active AND f.business_status='OPEN' AND nullif(f.name,'') IS NOT NULL AND nullif(coalesce(f.road_address,f.jibun_address),'') IS NOT NULL AND f.last_synced_at IS NOT NULL AND f.data_quality_score>=50 THEN 'SEO_READY'::seo_status ELSE 'NOINDEX_LOW_DATA'::seo_status END,
    'OFF'::monetization_status,${base}||'/'||CASE f.facility_type WHEN 'ANIMAL_HOSPITAL' THEN 'hospital' WHEN 'ANIMAL_PHARMACY' THEN 'pharmacy' ELSE 'funeral' END||'/'||r.full_slug||'/'||f.id
   FROM facilities f JOIN regions r ON r.id=f.region_id WHERE r.is_active AND f.facility_type IN ('ANIMAL_HOSPITAL','ANIMAL_PHARMACY','PET_FUNERAL')
   ON CONFLICT(canonical_url) DO UPDATE SET result_count=EXCLUDED.result_count,page_quality_score=EXCLUDED.page_quality_score,
   seo_status=CASE WHEN seo_pages.manual_hold THEN 'NOINDEX_MANUAL'::seo_status ELSE EXCLUDED.seo_status END,monetization_status='OFF',last_evaluated_at=now()`;
  await tx`INSERT INTO seo_pages(page_type,facility_type,result_count,page_quality_score,seo_status,monetization_status,canonical_url)
   SELECT CASE facility_type WHEN 'ANIMAL_HOSPITAL' THEN 'HOSPITAL_REGION' WHEN 'ANIMAL_PHARMACY' THEN 'PHARMACY_REGION' ELSE 'FUNERAL_REGION' END,facility_type,count(*)::int,coalesce(avg(data_quality_score),0)::int,
   CASE WHEN count(*)>=CASE facility_type WHEN 'PET_FUNERAL' THEN 2 ELSE 5 END AND avg(data_quality_score)>=50 THEN 'SEO_READY'::seo_status ELSE 'NOINDEX_LOW_DATA'::seo_status END,'OFF',
   ${base}||'/'||CASE facility_type WHEN 'ANIMAL_HOSPITAL' THEN 'hospital' WHEN 'ANIMAL_PHARMACY' THEN 'pharmacy' ELSE 'funeral' END
   FROM facilities WHERE is_active AND business_status='OPEN' AND facility_type IN ('ANIMAL_HOSPITAL','ANIMAL_PHARMACY','PET_FUNERAL') GROUP BY facility_type
   ON CONFLICT(canonical_url) DO UPDATE SET result_count=EXCLUDED.result_count,page_quality_score=EXCLUDED.page_quality_score,seo_status=CASE WHEN seo_pages.manual_hold THEN 'NOINDEX_MANUAL'::seo_status ELSE EXCLUDED.seo_status END,monetization_status='OFF',last_evaluated_at=now()`;
  await tx`WITH active_batch AS (SELECT id FROM fee_import_batches WHERE status='SUCCESS' ORDER BY survey_year DESC,imported_at DESC LIMIT 1),valid AS (
    SELECT m.* FROM medical_fee_statistics m JOIN active_batch b ON b.id=m.import_batch_id
    AND nullif(m.source_name,'') IS NOT NULL AND m.source_url LIKE 'https://%' AND m.source_date IS NOT NULL
    AND m.item_code ~ '^[a-z0-9-]+$' AND coalesce(m.median_price,m.average_price,m.minimum_price,m.maximum_price) IS NOT NULL
   ), pages AS (
    SELECT current_region_id AS region_id,item_code,count(*)::int AS total FROM valid WHERE current_region_id IS NOT NULL GROUP BY current_region_id,item_code
    UNION ALL SELECT current_region_id,NULL,count(*)::int FROM valid WHERE current_region_id IS NOT NULL GROUP BY current_region_id
    UNION ALL SELECT NULL,NULL,count(*)::int FROM valid
   )
   INSERT INTO seo_pages(page_type,region_id,result_count,page_quality_score,seo_status,monetization_status,canonical_url)
   SELECT CASE WHEN p.item_code IS NULL THEN 'COST_REGION' ELSE 'COST_ITEM' END,p.region_id,p.total,CASE WHEN p.total>0 THEN 70 ELSE 0 END,CASE WHEN p.total>0 THEN 'SEO_READY'::seo_status ELSE 'NOINDEX_LOW_DATA'::seo_status END,'OFF',
   ${base}||'/cost'||CASE WHEN r.full_slug IS NOT NULL THEN '/'||r.full_slug ELSE '' END||CASE WHEN p.item_code IS NOT NULL THEN '/'||p.item_code ELSE '' END
   FROM pages p LEFT JOIN regions r ON r.id=p.region_id
   ON CONFLICT(canonical_url) DO UPDATE SET result_count=EXCLUDED.result_count,page_quality_score=EXCLUDED.page_quality_score,seo_status=CASE WHEN seo_pages.manual_hold THEN 'NOINDEX_MANUAL'::seo_status ELSE EXCLUDED.seo_status END,monetization_status='OFF',last_evaluated_at=now()`;
  return {regionalPages:evaluated.length};
 });
}
