import { chromium } from "@playwright/test";

const base="http://localhost:3000";
const routes=[
 ["부산 병원","/hospital/busan"],["여수 병원","/hospital/jeonnam-gwangju/yeosu"],
 ["서울 약국","/pharmacy/seoul"],["부산 약국","/pharmacy/busan"],["여수 약국","/pharmacy/jeonnam-gwangju/yeosu"],
 ["순천 약국","/pharmacy/jeonnam-gwangju/suncheon"],["대구 약국","/pharmacy/daegu"],["인천 약국","/pharmacy/incheon"],["제주 약국","/pharmacy/jeju"],
 ["경기 장례","/funeral/gyeonggi"],["부산 장례","/funeral/busan"],["전남광주 장례","/funeral/jeonnam-gwangju"],
] as const;

async function main(){
 const browser=await chromium.launch({headless:true});const page=await browser.newPage();const results=[];
 for(const [label,path] of routes){
  const response=await page.goto(base+path,{waitUntil:"domcontentloaded",timeout:30000});await page.waitForTimeout(500);
  const cards=page.locator(".facility-list > div");const first=cards.first();const detail=page.getByRole("link",{name:"상세보기"}).first();const detailHref=await detail.getAttribute("href");
  results.push({label,path,status:response?.status(),title:await page.title(),h1:await page.locator("h1").innerText(),canonical:await page.locator('link[rel="canonical"]').getAttribute("href"),breadcrumb:await page.getByRole("navigation",{name:"현재 위치"}).innerText(),cards:await cards.count(),first_name:await first.locator("h2").innerText(),first_text:(await first.innerText()).slice(0,250),map:await page.locator(".map-frame").count()===1,map_markers:await page.locator('.map-frame img[style*="cursor: pointer"],.map-frame img[title]').count(),detail_status:detailHref?(await page.request.get(new URL(detailHref,base).href)).status():null});
 }
 await page.goto(base+"/hospital/jeonnam-gwangju/yeosu",{waitUntil:"domcontentloaded"});
 const hospitalDetail=await page.getByRole("link",{name:"상세보기"}).first().getAttribute("href");
 if(!hospitalDetail)throw new Error("HOSPITAL_DETAIL_MISSING");
 await page.goto(new URL(hospitalDetail,base).href,{waitUntil:"domcontentloaded"});
 const nearbySection=page.locator(".detail-aside section").filter({hasText:"주변 동물약국"});
 const nearbyHeadings=nearbySection.locator("h2");
 const nearby={heading:await nearbyHeadings.first().innerText(),pharmacy_cards:Math.max(0,(await nearbyHeadings.count())-1),text:(await nearbySection.innerText()).slice(0,500)};
 await browser.close();console.log(JSON.stringify({results,nearby},null,2));
}
main().catch(error=>{console.error(error instanceof Error?error.message:"QA_FAILED");process.exitCode=1;});
