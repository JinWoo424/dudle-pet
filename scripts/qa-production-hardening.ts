import "./env";
import { chromium } from "@playwright/test";
import { closeSql,getSql } from "@/db/connection";

const local="http://localhost:3000",production=(process.env.NEXT_PUBLIC_SITE_URL||"https://pet.dudle.co.kr").replace(/\/$/,"");
async function main(){
 const sql=getSql();const sitemapRows=await sql`SELECT canonical_url,page_type FROM seo_pages s WHERE seo_status='SEO_READY' AND NOT manual_hold AND (region_id IS NULL OR EXISTS(SELECT 1 FROM regions r WHERE r.id=s.region_id AND r.is_active)) ORDER BY canonical_url`;
 const sampleSize=Math.min(72,sitemapRows.length);const sample=Array.from({length:sampleSize},(_,index)=>sitemapRows[Math.floor(index*(sitemapRows.length-1)/Math.max(1,sampleSize-1))]);
 const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:900}});const failures:string[]=[];
 for(const row of sample){
  const expected=new URL(String(row.canonical_url));const response=await page.goto(local+expected.pathname,{waitUntil:"domcontentloaded",timeout:30000});
  const canonical=await page.locator('link[rel="canonical"]').getAttribute("href");const robots=await page.locator('meta[name="robots"]').getAttribute("content");
  if(response?.status()!==200)failures.push(`${row.page_type}:HTTP_${response?.status()}`);
  if(canonical!==expected.href&&canonical!==expected.pathname)failures.push(`${row.page_type}:CANONICAL`);
  if(robots?.toLowerCase().includes("noindex"))failures.push(`${row.page_type}:NOINDEX`);
 }
 const representatives=["/hospital/seoul","/hospital/busan","/hospital/jeonnam-gwangju/yeosu","/pharmacy/busan","/pharmacy/jeonnam-gwangju/yeosu","/funeral/gyeonggi"];
 const pages=[];for(const path of representatives){const response=await page.goto(local+path,{waitUntil:"domcontentloaded"});pages.push({path,status:response?.status(),title:await page.title(),description:await page.locator('meta[name="description"]').getAttribute("content"),canonical:await page.locator('link[rel="canonical"]').getAttribute("href"),h1:await page.locator("h1").innerText(),breadcrumb:await page.getByRole("navigation",{name:"현재 위치"}).count()===1});}
 await page.setViewportSize({width:375,height:812});await page.goto(local+"/cost/jeonnam-gwangju/yeosu",{waitUntil:"domcontentloaded"});const mobile={status:(await page.request.get(local+"/cost/jeonnam-gwangju/yeosu")).status(),h1:await page.locator("h1").innerText(),empty:await page.getByText("공식 진료비 데이터를 준비 중입니다.").count()===1,noindex:(await page.locator('meta[name="robots"]').getAttribute("content"))?.includes("noindex")??false,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth)};
 await page.setViewportSize({width:1440,height:900});await page.goto(local+"/cost",{waitUntil:"domcontentloaded"});const desktop={h1:await page.locator("h1").innerText(),empty:await page.getByText("공식 진료비 데이터를 준비 중입니다.").count()===1,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth)};
 await page.goto(local+"/hospital/jeonnam-gwangju/yeosu",{waitUntil:"domcontentloaded"});const detailHref=await page.getByRole("link",{name:"상세보기"}).first().getAttribute("href");if(!detailHref)throw new Error("DETAIL_MISSING");await page.goto(local+detailHref,{waitUntil:"domcontentloaded"});const structured=JSON.parse(await page.locator('script[type="application/ld+json"]').textContent()||"{}");const structuredAudit={name:Boolean(structured.name),address:Boolean(structured.address),phone:structured.telephone?true:"not_provided",geo:structured.geo?true:"not_provided",openingHours:"openingHours" in structured,service:"service" in structured};
 const [robots,sitemap]=await Promise.all([page.request.get(local+"/robots.txt"),page.request.get(local+"/sitemap.xml")]);await browser.close();
 console.log(JSON.stringify({sitemapTotal:sitemapRows.length,sitemapSample:sampleSize,sitemapSampleFailures:failures,pages,mobile,desktop,structuredAudit,robotsStatus:robots.status(),sitemapStatus:sitemap.status(),productionOrigin:production},null,2));
 if(failures.length||mobile.status!==200||!mobile.empty||!mobile.noindex||mobile.overflow||desktop.overflow||structuredAudit.openingHours||structuredAudit.service||robots.status()!==200||sitemap.status()!==200)process.exitCode=1;
}
main().catch(error=>{console.error(error instanceof Error?error.message:"QA_FAILED");process.exitCode=1;}).finally(closeSql);
