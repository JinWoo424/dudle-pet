import "./env";
import { closeSql, getSql } from "@/db/connection";

async function main(){
 const sql=getSql();
 const status=await sql`SELECT page_type,seo_status,count(*)::int AS count FROM seo_pages GROUP BY page_type,seo_status ORDER BY page_type,seo_status`;
 const [sitemap]=await sql`SELECT count(*)::int AS eligible FROM seo_pages s WHERE seo_status='SEO_READY' AND NOT manual_hold AND (region_id IS NULL OR EXISTS(SELECT 1 FROM regions r WHERE r.id=s.region_id AND r.is_active))`;
 const [hospitalRegions]=await sql`SELECT count(*) FILTER(WHERE seo_status='SEO_READY')::int AS ready,count(*) FILTER(WHERE seo_status='NOINDEX_LOW_DATA')::int AS low_data FROM seo_pages s JOIN regions r ON r.id=s.region_id WHERE s.page_type='HOSPITAL_REGION' AND r.is_active`;
 const legacy=await sql`SELECT a.alias_slug,a.redirect_status,r.full_slug FROM region_aliases a JOIN regions r ON r.id=a.region_id WHERE a.alias_slug IN ('jeonnam/yeosu','gwangju') ORDER BY a.alias_slug`;
 const legacyInSitemap=await sql`SELECT canonical_url FROM seo_pages WHERE seo_status='SEO_READY' AND (canonical_url LIKE '%/hospital/jeonnam/yeosu%' OR canonical_url LIKE '%/hospital/gwangju%')`;
 console.log(JSON.stringify({status,sitemap,hospital_regions:hospitalRegions,legacy,legacy_in_sitemap:legacyInSitemap},null,2));
}
main().finally(closeSql);
