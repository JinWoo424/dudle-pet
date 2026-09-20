import { getSql } from "@/db/connection";
import { dataMode } from "@/lib/data-mode";
import { buildRegionalJourney,type RegionalPageCandidate } from "@/lib/regional-journey";
import { cache } from "react";
export async function seoApproved(path:string) {
 if(dataMode()==="mock")return false;
 const url=new URL(path,process.env.NEXT_PUBLIC_SITE_URL||"https://pet.dudle.co.kr").href;
 const rows=await getSql()`SELECT id FROM seo_pages WHERE canonical_url=${url} AND seo_status='SEO_READY' AND NOT manual_hold LIMIT 1`;
 return rows.length>0;
}
export const regionalJourney=cache(async(slug:string,currentPath:string)=>{
 if(dataMode()==="mock")return [];
 const rows=await getSql()<RegionalPageCandidate[]>`SELECT s.canonical_url,s.page_type,r.full_slug AS region_slug,r.name AS region_name FROM seo_pages s JOIN regions r ON r.id=s.region_id WHERE r.is_active AND (r.full_slug=${slug} OR starts_with(${slug},r.full_slug||'/')) AND s.seo_status='SEO_READY' AND NOT s.manual_hold AND s.page_type IN ('HOSPITAL_REGION','PHARMACY_REGION','FUNERAL_REGION','COST_REGION','HOSPITAL_24H','HOSPITAL_NIGHT','HOSPITAL_EXOTIC','COST_ITEM')`;
 return buildRegionalJourney(rows,slug,currentPath,process.env.NEXT_PUBLIC_SITE_URL||"https://pet.dudle.co.kr");
});
