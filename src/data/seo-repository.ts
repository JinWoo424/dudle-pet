import { getSql } from "@/db/connection";
import { dataMode } from "@/lib/data-mode";
export async function seoApproved(path:string) {
 if(dataMode()==="mock")return false;
 const url=new URL(path,process.env.NEXT_PUBLIC_SITE_URL||"https://pet.dudle.co.kr").href;
 const rows=await getSql()`SELECT id FROM seo_pages WHERE canonical_url=${url} AND seo_status='SEO_READY' AND NOT manual_hold LIMIT 1`;
 return rows.length>0;
}
export async function relatedSeoLinks(slug:string){
 if(dataMode()==="mock")return [];
 const rows=await getSql()`SELECT canonical_url,page_type FROM seo_pages s JOIN regions r ON r.id=s.region_id WHERE r.full_slug=${slug} AND s.seo_status='SEO_READY' AND NOT s.manual_hold AND s.page_type<>'FACILITY_DETAIL' ORDER BY s.canonical_url LIMIT 8`;
 const base=new URL(process.env.NEXT_PUBLIC_SITE_URL||"https://pet.dudle.co.kr");
 return rows.flatMap(r=>{try{const url=new URL(r.canonical_url);return url.origin===base.origin?[{path:url.pathname,label:url.pathname.startsWith("/cost")?"지역 진료비":url.pathname.startsWith("/pharmacy")?"지역 동물약국":url.pathname.startsWith("/funeral")?"지역 장례시설":"지역 동물병원"}]:[];}catch{return [];}});
}
