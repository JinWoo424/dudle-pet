import { writeFile } from "node:fs/promises";

const productionOrigin = "https://pet.dudle.co.kr";
const targetOrigin = (process.env.SEO_QA_URL || productionOrigin).replace(/\/$/, "");
const regions = [
  ["/hospital/seoul", "서울"], ["/hospital/busan", "부산"], ["/hospital/daegu", "대구"],
  ["/hospital/incheon", "인천"], ["/hospital/daejeon", "대전"], ["/hospital/ulsan", "울산"],
  ["/hospital/sejong", "세종"], ["/hospital/jeju", "제주"],
  ["/hospital/gyeonggi/r-41110", "수원"], ["/hospital/gyeonggi/r-41130", "성남"],
  ["/hospital/gyeonggi/r-41460", "용인"], ["/hospital/gyeongnam/r-48120", "창원"],
  ["/hospital/gyeongbuk/r-47110", "포항"], ["/hospital/jeonbuk/r-52110", "전주"],
  ["/hospital/chungbuk/r-43110", "청주"], ["/hospital/chungnam/r-44130", "천안"],
  ["/hospital/gangwon/r-51110", "춘천"], ["/hospital/jeonnam-gwangju/yeosu", "여수"],
  ["/hospital/jeonnam-gwangju/suncheon", "순천"], ["/hospital/seoul/r-11680", "강남구"],
  ["/hospital/seoul/r-11650", "서초구"], ["/hospital/seoul/r-11710", "송파구"],
  ["/hospital/busan/r-26350", "해운대구"],
];

const match = (html, patterns) => patterns.map((pattern) => html.match(pattern)?.[1]).find(Boolean)?.replaceAll("&amp;", "&").trim() || "";
const get = (path, userAgent = "Mozilla/5.0 SEO QA") => fetch(`${targetOrigin}${path}`, { headers: { "user-agent": userAgent }, redirect: "follow", signal: AbortSignal.timeout(30000) });
const failures = [];
const pages = [];

for (const [path, label] of regions) {
  try {
    const response = await get(path, "Yeti/1.1 (NaverBot SEO QA)");
    const html = await response.text();
    const title = match(html, [/<title>([^<]*)<\/title>/i]);
    const description = match(html, [/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i]);
    const canonical = match(html, [/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)/i, /<link[^>]+href=["']([^"']*)["'][^>]+rel=["']canonical["']/i]);
    const robots = match(html, [/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)/i, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']robots["']/i]).toLowerCase();
    const h1 = match(html, [/<h1[^>]*>([\s\S]*?)<\/h1>/i]).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const checks = {
      status: response.status === 200,
      title: title.startsWith(`${label} 동물병원`) && /\d+곳/.test(title),
      description: description.includes(`${label} 동물병원`) && /\d+곳/.test(description) && /기준일/.test(description),
      h1: h1.startsWith(`${label} 동물병원`),
      canonical: canonical === `${productionOrigin}${path}`,
      robots: robots.includes("index") && robots.includes("follow") && !robots.includes("noindex"),
      structuredData: (html.match(/application\/ld\+json/g) || []).length >= 2,
      summary: html.includes("공식 데이터 요약"),
      realData: !/개발용 가상 데이터|두들동물병원 [ABC]/.test(html),
    };
    const failed = Object.entries(checks).filter(([, value]) => !value).map(([key]) => key);
    if (failed.length) failures.push({ path, failed });
    pages.push({ path, status: response.status, title, description, h1, canonical, robots, wordCount: html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length, internalLinks: (html.match(/href=["']\//g) || []).length, structuredData: (html.match(/application\/ld\+json/g) || []).length, checks });
  } catch (error) {
    failures.push({ path, failed: [error instanceof Error ? error.message : "request"] });
  }
}

const robotsResponse = await get("/robots.txt", "Yeti/1.1");
const robotsText = await robotsResponse.text();
const naverAllowed = /User-agent:\s*Yeti[\s\S]*Allow:\s*\//i.test(robotsText) || /User-Agent:\s*\*[\s\S]*Allow:\s*\//i.test(robotsText);
const robotsOk = robotsResponse.status === 200 && naverAllowed && /Sitemap:\s*https:\/\/pet\.dudle\.co\.kr\/sitemap\.xml/i.test(robotsText);
if (!robotsOk) failures.push({ path: "/robots.txt", failed: ["production-crawl-policy"] });

const sitemapResponse = await get("/sitemap.xml");
const sitemapIndex = await sitemapResponse.text();
const shardPaths = [...sitemapIndex.matchAll(/<loc>https:\/\/pet\.dudle\.co\.kr([^<]+)<\/loc>/g)].map((match) => match[1]);
const sitemapUrls = [];
for (const path of shardPaths) {
  const response = await get(path);
  const xml = await response.text();
  sitemapUrls.push(...[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]));
}
const uniqueUrls = new Set(sitemapUrls);
const sitemap = {
  status: sitemapResponse.status,
  shards: shardPaths.length,
  urls: sitemapUrls.length,
  duplicates: sitemapUrls.length - uniqueUrls.size,
  invalidOrigin: sitemapUrls.filter((url) => !url.startsWith(`${productionOrigin}/`) || url.includes("vercel.app")).length,
  queryOrHash: sitemapUrls.filter((url) => /[?#]/.test(url)).length,
};
if (sitemap.status !== 200 || sitemap.shards !== 3 || sitemap.urls !== 23609 || sitemap.duplicates || sitemap.invalidOrigin || sitemap.queryOrHash) failures.push({ path: "/sitemap.xml", failed: ["sitemap-integrity"] });

const report = { targetOrigin, checkedPages: pages.length, pages, robotsOk, sitemap, failures };
if (process.env.SEO_QA_SNAPSHOT) await writeFile(process.env.SEO_QA_SNAPSHOT, `${JSON.stringify(pages.map((page) => Object.fromEntries(Object.entries(page).filter(([key]) => key !== "checks"))), null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
