import { chromium } from "@playwright/test";

const base = "http://localhost:3000";
const routes = [
  ["서울","/hospital/seoul"],["부산","/hospital/busan"],
  ["여수","/hospital/jeonnam-gwangju/yeosu"],["순천","/hospital/jeonnam-gwangju/suncheon"],
  ["광주권","/hospital/jeonnam-gwangju"],["대구","/hospital/daegu"],
  ["인천","/hospital/incheon"],["대전","/hospital/daejeon"],
  ["울산","/hospital/ulsan"],["제주","/hospital/jeju"],
] as const;

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const results = [];
  for (const [label, path] of routes) {
    const response = await page.goto(base + path, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(1_200);
    const detail = page.getByRole("link", { name: "상세보기" }).first();
    const detailHref = await detail.getAttribute("href");
    const card = page.locator(".facility-list > div").first();
    results.push({
      label, requested_path: path, final_path: new URL(page.url()).pathname,
      status: response?.status(), title: await page.title(), h1: await page.locator("h1").first().innerText(),
      canonical: await page.locator('link[rel="canonical"]').getAttribute("href"),
      breadcrumb: await page.getByRole("navigation", { name: "현재 위치" }).innerText(),
      displayed_cards: await page.locator(".facility-list > div").count(),
      first_name: await card.locator("h2").first().innerText(),
      first_card_text: (await card.innerText()).slice(0, 300),
      has_phone_link: await card.locator('a[href^="tel:"]').count() > 0,
      has_map: await page.locator(".map-frame").count() === 1,
      map_images: await page.locator(".map-frame img").count(),
      detail_href: detailHref,
      detail_status: detailHref ? (await page.request.get(new URL(detailHref, base).href)).status() : null,
    });
  }
  const legacy = [];
  for (const path of ["/hospital/jeonnam/yeosu","/hospital/gwangju"]) {
    const response = await page.goto(base + path, { waitUntil: "domcontentloaded" });
    legacy.push({requested_path:path,status:response?.status(),final_path:new URL(page.url()).pathname,canonical:await page.locator('link[rel="canonical"]').getAttribute("href")});
  }
  await browser.close();
  console.log(JSON.stringify({results,legacy},null,2));
}

main().catch((error)=>{console.error(error instanceof Error?error.message:"REGIONAL_QA_FAILED");process.exitCode=1;});
