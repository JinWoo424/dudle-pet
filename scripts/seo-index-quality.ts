import "./env";
import {closeSql,getSql} from "@/db/connection";

async function main(){
 const sql=getSql();
 const tiers=await sql`SELECT tier,count(*)::int AS count FROM (
  SELECT CASE
   WHEN seo_status<>'SEO_READY' OR manual_hold THEN 'C'
   WHEN page_type='FACILITY_DETAIL' AND page_quality_score>=80 THEN 'A'
   WHEN page_type='HOSPITAL_REGION' AND page_quality_score>=70 AND result_count>=20 THEN 'A'
   WHEN page_type='PHARMACY_REGION' AND page_quality_score>=70 AND result_count>=30 THEN 'A'
   WHEN page_type='FUNERAL_REGION' AND page_quality_score>=70 AND result_count>=3 THEN 'A'
   WHEN page_type IN ('COST_REGION','COST_ITEM') AND page_quality_score>=70 AND result_count>0 THEN 'A'
   ELSE 'B' END AS tier FROM seo_pages
 ) classified GROUP BY tier ORDER BY tier`;
 const readyByType=await sql`SELECT page_type,count(*)::int AS count,min(page_quality_score)::int AS minimum_quality,round(avg(page_quality_score),1) AS average_quality,max(page_quality_score)::int AS maximum_quality FROM seo_pages WHERE seo_status='SEO_READY' AND NOT manual_hold GROUP BY page_type ORDER BY page_type`;
 const [detailQuality]=await sql`SELECT count(*)::int AS ready,
  count(*) FILTER(WHERE f.phone_normalized IS NOT NULL)::int AS phone,
  count(*) FILTER(WHERE f.location IS NOT NULL AND f.geo_status='VALID')::int AS coordinates,
  count(*) FILTER(WHERE nullif(coalesce(f.road_address,f.jibun_address),'') IS NOT NULL)::int AS address,
  count(*) FILTER(WHERE f.source_updated_at IS NOT NULL)::int AS source_date,
  count(*) FILTER(WHERE f.phone_normalized IS NULL AND (f.location IS NULL OR f.geo_status<>'VALID'))::int AS thin_phone_and_coordinates
  FROM seo_pages s JOIN facilities f ON f.id=substring(s.canonical_url from '([0-9a-f-]{36})$')::uuid
  WHERE s.page_type='FACILITY_DETAIL' AND s.seo_status='SEO_READY' AND NOT s.manual_hold`;
 const [search]=await sql`SELECT
  coalesce(sum(impressions) FILTER(WHERE keyword~*'(두들펫|site\\s*:|pet\\.dudle\\.co\\.kr)'),0)::bigint AS brand_impressions,
  coalesce(sum(clicks) FILTER(WHERE keyword~*'(두들펫|site\\s*:|pet\\.dudle\\.co\\.kr)'),0)::bigint AS brand_clicks,
  coalesce(sum(impressions) FILTER(WHERE keyword!~*'(두들펫|site\\s*:|pet\\.dudle\\.co\\.kr)'),0)::bigint AS nonbrand_impressions,
  coalesce(sum(clicks) FILTER(WHERE keyword!~*'(두들펫|site\\s*:|pet\\.dudle\\.co\\.kr)'),0)::bigint AS nonbrand_clicks,
  max(updated_at) AS latest_metric_at FROM seo_keyword_metrics`;
 const removalCandidates=await sql`SELECT page_type,count(*)::int AS count FROM seo_pages WHERE seo_status='SEO_READY' AND NOT manual_hold AND ((page_type='FACILITY_DETAIL' AND page_quality_score<60) OR (page_type<>'FACILITY_DETAIL' AND (result_count=0 OR page_quality_score<45))) GROUP BY page_type ORDER BY page_type`;
 console.log(JSON.stringify({generatedAt:new Date().toISOString(),tierPolicy:{A:"SEO_READY high-value pages backed by measured result/quality thresholds",B:"other SEO_READY useful pages",C:"existing noindex or manual hold"},tiers,readyByType,detailQuality,searchMetrics:search,reviewOnlyRemovalCandidates:removalCandidates},null,2));
}
main().catch(error=>{console.error(error instanceof Error?error.message:"SEO_INDEX_QUALITY_FAILED");process.exitCode=1;}).finally(closeSql);
