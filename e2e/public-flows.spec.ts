import { test,expect } from "@playwright/test";
test("development fixture: home → region → facility → nearby pharmacy",async({page},testInfo)=>{
 const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
 await page.goto("/");
 await page.getByLabel("지역 또는 병원명 검색").fill("여수");
 await page.getByRole("button",{name:"검색",exact:true}).click();
 await page.getByRole("link",{name:"여수 동물병원 전체 보기"}).click();
 await expect(page.getByRole("heading",{name:"여수 동물병원",exact:true})).toBeVisible();
 await expect(page.getByText("개발용 가상 데이터",{exact:false}).first()).toBeVisible();
 await page.getByRole("link",{name:"두들동물병원 A",exact:true}).first().click();
 await expect(page.getByRole("heading",{name:"주변 동물약국"})).toBeVisible();
 const call=page.getByRole("link",{name:"전화하기",exact:true}).first();
 const directions=page.getByRole("link",{name:"길찾기",exact:true}).first();
 expect((await call.boundingBox())!.y).toBeLessThan(900);
 expect((await directions.boundingBox())!.y).toBeLessThan(900);
 await page.screenshot({path:testInfo.outputPath("detail.png"),fullPage:true});
 expect(errors).toEqual([]);
});
test("verified-only list and noindex development sitemap",async({page,request})=>{
 await page.goto("/hospital/jeonnam/yeosu/24h");
 await expect(page.getByRole("heading",{name:"여수 24시간 동물병원"})).toBeVisible();
 await expect(page.getByText("두들동물병원 E",{exact:true})).toHaveCount(0);
 await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content",/noindex/);
 expect(await(await request.get("/sitemap.xml")).text()).not.toContain("두들동물");
 expect(await(await request.get("/sitemap.xml")).text()).not.toContain("<sitemap>");
});
test("responsive pages do not overflow and ads are absent",async({page},testInfo)=>{
 for(const path of ["/","/cost/jeonnam/yeosu/xray","/pharmacy","/funeral","/nearby","/guide","/admin"]){
  await page.goto(path);await expect(page.locator("h1").first()).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
  expect(await page.locator('script[src*="adsbygoogle.js"]').count()).toBe(0);
  if(path==="/"){expect(await page.locator('script[src*="dapi.kakao.com"]').count()).toBe(0);await page.screenshot({path:testInfo.outputPath("home.png"),fullPage:true});}
 }
});
test("invalid regions and nonexistent facilities return 404",async({request})=>{
 expect((await request.get("/hospital/not-a-real-region")).status()).toBe(404);
 expect((await request.get("/hospital/jeonnam/yeosu/00000000-0000-0000-0000-000000000000")).status()).toBe(404);
});
test("nearby request returns fixture distance results and validates inputs",async({request})=>{
 const response=await request.post("/api/nearby",{data:{latitude:34.7604,longitude:127.6622,radiusMeters:5000,type:"ANIMAL_HOSPITAL"}});
 expect(response.status()).toBe(200);const body=await response.json();
 expect(body.facilities.every((f:{distanceMeters:number})=>f.distanceMeters<=5000)).toBe(true);
 expect((await request.post("/api/nearby",{data:{latitude:999,longitude:127,radiusMeters:5000,type:"ANIMAL_HOSPITAL"}})).status()).toBe(400);
});
