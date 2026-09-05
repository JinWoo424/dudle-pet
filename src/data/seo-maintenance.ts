import { getSql } from "@/db/connection";
export async function refreshSeo(){
 const sql=getSql();const base=(process.env.NEXT_PUBLIC_SITE_URL||"https://pet.dudle.co.kr").replace(/\/$/,"");
 return sql.begin(async tx=>{
  // Re-evaluate from a fail-closed baseline so moved/empty pages cannot retain
  // obsolete SEO_READY entries. A failed transaction preserves the prior state.
  await tx`UPDATE seo_pages SET seo_status=CASE WHEN manual_hold THEN 'NOINDEX_MANUAL'::seo_status ELSE 'NOINDEX_LOW_DATA'::seo_status END,result_count=0,monetization_status='OFF',last_evaluated_at=now()`;
  // Refresh all regional counts in SQL, including descendants.
  await tx`UPDATE regions r SET hospital_count=(SELECT count(*) FROM facilities f JOIN regions fr ON fr.id=f.region_id WHERE (fr.id=r.id OR starts_with(fr.full_slug,r.full_slug||'/')) AND f.is_active AND f.business_status='OPEN' AND f.facility_type='ANIMAL_HOSPITAL'),
   pharmacy_count=(SELECT count(*) FROM facilities f JOIN regions fr ON fr.id=f.region_id WHERE (fr.id=r.id OR starts_with(fr.full_slug,r.full_slug||'/')) AND f.is_active AND f.business_status='OPEN' AND f.facility_type='ANIMAL_PHARMACY'),
   funeral_count=(SELECT count(*) FROM facilities f JOIN regions fr ON fr.id=f.region_id WHERE (fr.id=r.id OR starts_with(fr.full_slug,r.full_slug||'/')) AND f.is_active AND f.business_status='OPEN' AND f.facility_type='PET_FUNERAL'),updated_at=now()`;
  await tx`UPDATE regions SET active_facility_count=hospital_count+pharmacy_count+funeral_count`;
  const evaluated=await tx`WITH variants(kind,path,page_type,feature,minimum) AS (VALUES
   ('ANIMAL_HOSPITAL','hospital','HOSPITAL_REGION',NULL::text,5),
   ('ANIMAL_PHARMACY','pharmacy','PHARMACY_REGION',NULL::text,5),
   ('PET_FUNERAL','funeral','FUNERAL_REGION',NULL::text,2),
   ('ANIMAL_HOSPITAL','hospital','HOSPITAL_24H','open_24h',2),
   ('ANIMAL_HOSPITAL','hospital','HOSPITAL_NIGHT','night_service',3),
   ('ANIMAL_HOSPITAL','hospital','HOSPITAL_EXOTIC','exotic_service',3)
  ), calculated AS (
   SELECT r.id AS region_id,v.*,count(f.id)::int AS total,
    COALESCE(avg(f.data_quality_score),0)::int AS quality
   FROM regions r CROSS JOIN variants v
   LEFT JOIN regions fr ON fr.id=r.id OR starts_with(fr.full_slug,r.full_slug||'/')
   LEFT JOIN facilities f ON f.region_id=fr.id AND f.facility_type::text=v.kind AND f.is_active AND f.business_status='OPEN'
    AND (v.feature IS NULL OR EXISTS(SELECT 1 FROM current_facility_verifications cv WHERE cv.facility_id=f.id AND cv.field_name=v.feature AND cv.field_value='YES'))
   GROUP BY r.id,v.kind,v.path,v.page_type,v.feature,v.minimum
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
   FROM facilities f JOIN regions r ON r.id=f.region_id WHERE f.facility_type IN ('ANIMAL_HOSPITAL','ANIMAL_PHARMACY','PET_FUNERAL')
   ON CONFLICT(canonical_url) DO UPDATE SET result_count=EXCLUDED.result_count,page_quality_score=EXCLUDED.page_quality_score,
   seo_status=CASE WHEN seo_pages.manual_hold THEN 'NOINDEX_MANUAL'::seo_status ELSE EXCLUDED.seo_status END,monetization_status='OFF',last_evaluated_at=now()`;
  await tx`INSERT INTO seo_pages(page_type,facility_type,result_count,page_quality_score,seo_status,monetization_status,canonical_url)
   SELECT CASE facility_type WHEN 'ANIMAL_HOSPITAL' THEN 'HOSPITAL_REGION' WHEN 'ANIMAL_PHARMACY' THEN 'PHARMACY_REGION' ELSE 'FUNERAL_REGION' END,facility_type,count(*)::int,coalesce(avg(data_quality_score),0)::int,
   CASE WHEN count(*)>=CASE facility_type WHEN 'PET_FUNERAL' THEN 2 ELSE 5 END AND avg(data_quality_score)>=50 THEN 'SEO_READY'::seo_status ELSE 'NOINDEX_LOW_DATA'::seo_status END,'OFF',
   ${base}||'/'||CASE facility_type WHEN 'ANIMAL_HOSPITAL' THEN 'hospital' WHEN 'ANIMAL_PHARMACY' THEN 'pharmacy' ELSE 'funeral' END
   FROM facilities WHERE is_active AND business_status='OPEN' AND facility_type IN ('ANIMAL_HOSPITAL','ANIMAL_PHARMACY','PET_FUNERAL') GROUP BY facility_type
   ON CONFLICT(canonical_url) DO UPDATE SET result_count=EXCLUDED.result_count,page_quality_score=EXCLUDED.page_quality_score,seo_status=CASE WHEN seo_pages.manual_hold THEN 'NOINDEX_MANUAL'::seo_status ELSE EXCLUDED.seo_status END,monetization_status='OFF',last_evaluated_at=now()`;
  await tx`WITH valid AS (
    SELECT m.* FROM medical_fee_statistics m JOIN fee_import_batches b ON b.id=m.import_batch_id
    WHERE b.status='SUCCESS' AND m.survey_year=(SELECT max(survey_year) FROM medical_fee_statistics)
    AND nullif(m.source_name,'') IS NOT NULL AND m.source_url LIKE 'https://%' AND m.source_date IS NOT NULL
    AND m.item_code ~ '^[a-z0-9-]+$' AND coalesce(m.median_price,m.average_price,m.minimum_price,m.maximum_price) IS NOT NULL
   ), pages AS (
    SELECT region_id,item_code,count(*)::int AS total FROM valid WHERE region_id IS NOT NULL GROUP BY region_id,item_code
    UNION ALL SELECT region_id,NULL,count(*)::int FROM valid WHERE region_id IS NOT NULL GROUP BY region_id
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
