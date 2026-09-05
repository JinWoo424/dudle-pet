import type { MetadataRoute } from "next";
import { dataMode } from "@/lib/data-mode";
export default function robots():MetadataRoute.Robots{
 const base=process.env.NEXT_PUBLIC_SITE_URL||"https://pet.dudle.co.kr";
 if(dataMode()==="mock")return {rules:[{userAgent:"*",disallow:"/"}]};
 return {rules:[{userAgent:"*",allow:"/",disallow:["/admin","/api/","/search","/nearby","/report"]}],sitemap:base+"/sitemap.xml"};
}
