import { chromium } from "@playwright/test";

async function main(){
 const base=(process.env.MAP_QA_URL??"http://localhost:3000").replace(/\/$/,"");
 const route=process.env.MAP_QA_PATH??"/hospital/jeonnam-gwangju/yeosu";
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage();
 await page.goto(base+route,{waitUntil:"networkidle"});
 const cards=page.locator(".facility-list > div");
 const selectable=page.getByRole("button",{name:"지도에서 선택"}).first();
 await selectable.click();
 const cardSelected=await cards.filter({has:page.locator('button[aria-pressed="true"]')}).count();
 const markerImages=page.locator('.map-frame img[style*="cursor: pointer"], .map-frame img[title]');
 const markerCount=await markerImages.count();
 const windowKakao=await page.evaluate(()=>Boolean(window.kakao?.maps));
 let markerClickSelected=false;
 if(markerCount){
  await markerImages.first().click({force:true});
  await page.waitForTimeout(200);
  markerClickSelected=await page.locator(".selected-facility").count()===1;
 }
 const detailHref=await page.getByRole("link",{name:"상세보기"}).first().getAttribute("href");
 if(!detailHref)throw new Error("DETAIL_LINK_MISSING");
 const response=await page.goto(new URL(detailHref,base).href,{waitUntil:"domcontentloaded"});
 const result={route,map_loaded:markerCount>0,window_kakao:windowKakao,marker_count:markerCount,card_to_marker_selected:cardSelected===1,marker_to_card_selected:markerClickSelected,detail_status:response?.status(),detail_h1:await page.locator("h1").innerText(),detail_breadcrumb:await page.getByRole("navigation",{name:"현재 위치"}).innerText(),detail_canonical:await page.locator('link[rel="canonical"]').getAttribute("href")};
 await browser.close();
 console.log(JSON.stringify(result));
}
main().catch(error=>{console.error(error instanceof Error?error.message:"MAP_QA_FAILED");process.exitCode=1;});
