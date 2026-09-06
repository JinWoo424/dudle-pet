import "./env";
import { closeSql,getSql } from "@/db/connection";

async function main(){
 const sql=getSql();
 const facilityCounts=await sql`SELECT facility_type,business_status,count(*)::int AS count FROM facilities GROUP BY facility_type,business_status ORDER BY facility_type,business_status`;
 const [integrity]=await sql`SELECT count(*) FILTER(WHERE geo_status='VALID' AND location IS NOT NULL)::int AS coordinate_valid,
  count(*) FILTER(WHERE geo_status='MISSING')::int AS coordinate_missing,count(*) FILTER(WHERE geo_status IN('INVALID','REVIEW_REQUIRED'))::int AS coordinate_invalid,
  count(*) FILTER(WHERE region_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM regions r WHERE r.id=facilities.region_id))::int AS orphan_regions,
  (SELECT count(*)::int FROM (SELECT public_source,public_source_id FROM facilities GROUP BY public_source,public_source_id HAVING count(*)>1) d) AS duplicate_source_ids
  FROM facilities`;
 const reviews=await sql`SELECT source_type,count(*)::int AS count FROM facility_duplicate_reviews WHERE decision='REVIEW_REQUIRED' GROUP BY source_type ORDER BY source_type`;
 const [fees]=await sql`SELECT (SELECT count(*)::int FROM fee_import_batches) AS batches,(SELECT count(*)::int FROM medical_fee_statistics) AS rows`;
 const [seo]=await sql`SELECT count(*) FILTER(WHERE seo_status='SEO_READY')::int AS ready,
  count(*) FILTER(WHERE seo_status='SEO_READY' AND (canonical_url!~'^https://pet\\.dudle\\.co\\.kr/' OR canonical_url~'[?#]'))::int AS invalid_canonical,
  count(*) FILTER(WHERE seo_status='SEO_READY' AND (canonical_url~'/admin(?:/|$)' OR canonical_url~'/search(?:/|$)' OR canonical_url~'/nearby(?:/|$)'))::int AS forbidden_routes,
  count(*) FILTER(WHERE seo_status='SEO_READY' AND (canonical_url~'/hospital/jeonnam/yeosu' OR canonical_url~'/hospital/gwangju'))::int AS legacy_routes,
  count(*) FILTER(WHERE seo_status='SEO_READY' AND canonical_url!~'^https://pet\\.dudle\\.co\\.kr/(hospital|pharmacy|funeral|cost)(/|$)')::int AS invalid_route_pattern
  FROM seo_pages WHERE NOT manual_hold`;
 const [detail]=await sql`SELECT count(*)::int AS invalid_detail FROM seo_pages s JOIN facilities f ON right(s.canonical_url,36)=f.id::text
  WHERE s.page_type='FACILITY_DETAIL' AND s.seo_status='SEO_READY' AND (NOT f.is_active OR f.business_status<>'OPEN' OR f.region_status<>'MATCHED' OR f.data_quality_score<50)`;
 const [orphanDetail]=await sql`SELECT count(*)::int AS count FROM seo_pages s LEFT JOIN facilities f ON right(s.canonical_url,36)=f.id::text WHERE s.page_type='FACILITY_DETAIL' AND s.seo_status='SEO_READY' AND f.id IS NULL`;
 const migrations=await sql`SELECT name FROM schema_migrations ORDER BY name`;
 console.log(JSON.stringify({facilityCounts,integrity,reviews,fees,seo,invalidSeoDetails:Number(detail.invalid_detail),orphanSeoDetails:Number(orphanDetail.count),migrations:migrations.map(row=>row.name)},null,2));
}
main().finally(closeSql);
