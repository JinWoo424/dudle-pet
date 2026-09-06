import { sitemapPageCount, siteBase, xmlEscape, xmlResponse } from "@/lib/sitemap";
export const runtime="nodejs";
export async function GET(){
 try {const count=await sitemapPageCount();return xmlResponse(`<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${Array.from({length:count},(_,i)=>`<sitemap><loc>${xmlEscape(siteBase())}/sitemaps/${i+1}.xml</loc></sitemap>`).join("")}</sitemapindex>`);}
 catch{return new Response("Sitemap temporarily unavailable",{status:503,headers:{"Retry-After":"3600"}});}
}
