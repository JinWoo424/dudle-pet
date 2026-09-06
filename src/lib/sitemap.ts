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
 const rows=await getSql()`SELECT canonical_url,last_evaluated_at FROM seo_pages s WHERE seo_status='SEO_READY' AND NOT manual_hold AND (region_id IS NULL OR EXISTS(SELECT 1 FROM regions r WHERE r.id=s.region_id AND r.is_active)) ORDER BY canonical_url LIMIT 10000 OFFSET ${(page-1)*10000}`;
 return rows.flatMap(row=>{
  try {const url=new URL(row.canonical_url,siteBase());if(url.origin!==new URL(siteBase()).origin||url.search||url.hash)return [];
   return [{url:url.href,lastmod:new Date(row.last_evaluated_at).toISOString()}];
  }catch{return [];}
 });
}
export function xmlResponse(body:string){return new Response(`<?xml version="1.0" encoding="UTF-8"?>${body}`,{headers:{"Content-Type":"application/xml; charset=utf-8","Cache-Control":"no-store"}});}
