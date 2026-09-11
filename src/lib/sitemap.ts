import { getSql } from "@/db/connection";
import { dataMode } from "@/lib/data-mode";
export const xmlEscape=(value:string)=>value.replace(/[<>&"']/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;","'":"&apos;"}[c]!));
export const siteBase=()=>process.env.NEXT_PUBLIC_SITE_URL||"https://pet.dudle.co.kr";
export async function sitemapPageCount(){
 if(dataMode()==="mock")return 0;
 const [row]=await getSql()`SELECT count(*)::int AS count FROM seo_pages s WHERE seo_status='SEO_READY' AND NOT manual_hold AND (region_id IS NULL OR EXISTS(SELECT 1 FROM regions r WHERE r.id=s.region_id AND r.is_active))`;
 return Math.ceil(row.count/10000);
}
export async function urlsForSitemap(page:number){
 if(dataMode()==="mock")return [];
 const rows=await getSql()`WITH selected AS MATERIALIZED (
   SELECT s.canonical_url,s.page_type,s.region_id,s.facility_type,s.generated_at
   FROM seo_pages s
   WHERE s.seo_status='SEO_READY' AND NOT s.manual_hold AND (s.region_id IS NULL OR EXISTS(SELECT 1 FROM regions r WHERE r.id=s.region_id AND r.is_active))
   ORDER BY s.canonical_url LIMIT 10000 OFFSET ${(page-1)*10000}
  ), regional_targets AS MATERIALIZED (
   SELECT DISTINCT region_id,facility_type FROM selected WHERE region_id IS NOT NULL AND page_type IN ('HOSPITAL_REGION','PHARMACY_REGION','FUNERAL_REGION','HOSPITAL_24H','HOSPITAL_NIGHT','HOSPITAL_EXOTIC')
  ), regional_dates AS MATERIALIZED (
   SELECT target.region_id,target.facility_type,max(coalesce(f.source_updated_at,f.updated_at)) AS meaningful_at
   FROM regional_targets target JOIN regions ancestor ON ancestor.id=target.region_id
   JOIN regions leaf ON leaf.is_active AND (leaf.id=ancestor.id OR starts_with(leaf.full_slug,ancestor.full_slug||'/'))
   JOIN facilities f ON f.region_id=leaf.id AND f.facility_type=target.facility_type AND f.is_active AND f.business_status='OPEN'
   GROUP BY target.region_id,target.facility_type
  ), global_dates AS MATERIALIZED (
   SELECT facility_type,max(coalesce(source_updated_at,updated_at)) AS meaningful_at FROM facilities WHERE is_active AND business_status='OPEN' GROUP BY facility_type
  ), cost_targets AS MATERIALIZED (
   SELECT DISTINCT region_id FROM selected WHERE region_id IS NOT NULL AND page_type IN ('COST_REGION','COST_ITEM')
  ), cost_dates AS MATERIALIZED (
   SELECT target.region_id,max(m.source_date)::timestamptz AS meaningful_at FROM cost_targets target JOIN medical_fee_statistics m ON m.current_region_id=target.region_id JOIN fee_import_batches b ON b.id=m.import_batch_id AND b.status='SUCCESS' GROUP BY target.region_id
  ), global_cost AS (
   SELECT max(source_date)::timestamptz AS meaningful_at FROM medical_fee_statistics m JOIN fee_import_batches b ON b.id=m.import_batch_id AND b.status='SUCCESS'
  )
  SELECT s.canonical_url,coalesce(detail.source_updated_at,detail.updated_at,rd.meaningful_at,gd.meaningful_at,CASE WHEN s.page_type IN ('COST_REGION','COST_ITEM') THEN coalesce(cd.meaningful_at,gc.meaningful_at) END,s.generated_at) AS meaningful_at
  FROM selected s
  LEFT JOIN facilities detail ON detail.id=CASE WHEN s.page_type='FACILITY_DETAIL' AND right(s.canonical_url,36) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN right(s.canonical_url,36)::uuid END
  LEFT JOIN regional_dates rd ON s.page_type IN ('HOSPITAL_REGION','PHARMACY_REGION','FUNERAL_REGION','HOSPITAL_24H','HOSPITAL_NIGHT','HOSPITAL_EXOTIC') AND rd.region_id=s.region_id AND rd.facility_type=s.facility_type
  LEFT JOIN global_dates gd ON s.region_id IS NULL AND s.page_type IN ('HOSPITAL_REGION','PHARMACY_REGION','FUNERAL_REGION') AND gd.facility_type=s.facility_type
  LEFT JOIN cost_dates cd ON s.page_type IN ('COST_REGION','COST_ITEM') AND cd.region_id=s.region_id
  CROSS JOIN global_cost gc
  ORDER BY s.canonical_url`;
 return rows.flatMap(row=>{
  try {const url=new URL(row.canonical_url,siteBase());if(url.origin!==new URL(siteBase()).origin||url.search||url.hash)return [];
   return [{url:url.href,lastmod:new Date(row.meaningful_at).toISOString()}];
  }catch{return [];}
 });
}
export function xmlResponse(body:string){return new Response(`<?xml version="1.0" encoding="UTF-8"?>${body}`,{headers:{"Content-Type":"application/xml; charset=utf-8","Cache-Control":"no-store"}});}
