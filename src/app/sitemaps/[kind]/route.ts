import { sitemapPageCount, urlsForSitemap, xmlEscape, xmlResponse } from "@/lib/sitemap";
import { regionDirectory } from "@/data/region-directory";
import { siteBase } from "@/lib/sitemap";
export const runtime="nodejs";
export async function GET(_request:Request,{params}:{params:Promise<{kind:string}>}){
 const kind=(await params).kind;if(!/^[1-9]\d*\.xml$/.test(kind))return new Response("Not found",{status:404});
 const page=Number(kind.split(".")[0]);if(!Number.isSafeInteger(page))return new Response("Not found",{status:404});
 try {
  if(page>await sitemapPageCount())return new Response("Not found",{status:404});
  const urls=await urlsForSitemap(page);
  const hub=page===1&&(await regionDirectory()).length>0?`<url><loc>${xmlEscape(new URL('/regions',siteBase()).href)}</loc></url>`:"";
  return xmlResponse(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${hub}${urls.map(r=>`<url><loc>${xmlEscape(r.url)}</loc><lastmod>${xmlEscape(r.lastmod)}</lastmod></url>`).join("")}</urlset>`);
 }catch{return new Response("Sitemap temporarily unavailable",{status:503,headers:{"Retry-After":"3600"}});}
}
