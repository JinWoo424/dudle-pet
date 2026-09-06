export const previewPaths = [
  "/", "/hospital", "/hospital/busan", "/hospital/jeonnam-gwangju/yeosu",
  "/pharmacy/busan", "/pharmacy/jeonnam-gwangju/yeosu", "/funeral/busan",
  "/cost", "/admin", "/robots.txt", "/sitemap.xml", "/api/health",
];

const htmlPaths = new Set(["/", "/hospital", "/hospital/busan", "/hospital/jeonnam-gwangju/yeosu", "/pharmacy/busan", "/pharmacy/jeonnam-gwangju/yeosu", "/funeral/busan", "/cost", "/admin"]);
const canonicalPaths = new Set([...htmlPaths].filter((path) => path !== "/admin"));

export async function inspectPreview(baseUrl) {
  const base = new URL(baseUrl);
  const results = [];
  const failures = [];
  for (const path of previewPaths) {
    try {
      const response = await fetch(new URL(path, base), { redirect: "follow", signal: AbortSignal.timeout(20000) });
      const text = await response.text();
      const robotsHeader = response.headers.get("x-robots-tag")?.toLowerCase() ?? "";
      const noindex = robotsHeader.includes("noindex") && robotsHeader.includes("nofollow");
      const title = !htmlPaths.has(path) || /<title>[^<]+<\/title>/i.test(text);
      const canonicalMatch = text.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i) ?? text.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
      const canonical = !canonicalPaths.has(path) || Boolean(canonicalMatch?.[1]?.startsWith("https://pet.dudle.co.kr"));
      const adsAbsent = !/pagead2\.googlesyndication\.com|adsbygoogle/i.test(text);
      const mockAbsent = !/개발용 가상 데이터|두들동물병원 [ABC]/i.test(text);
      const passed = response.ok && noindex && title && canonical && adsAbsent && mockAbsent;
      results.push({ path, status: response.status, noindex, title, canonical, adsAbsent, mockAbsent, passed });
      if (!passed) failures.push(path);
      if (path === "/robots.txt" && (!/Disallow:\s*\//i.test(text) || /Sitemap:/i.test(text))) failures.push("robots-policy");
      if (path === "/sitemap.xml" && (!text.includes("https://pet.dudle.co.kr") || text.includes(base.hostname))) failures.push("sitemap-host");
      if (path === "/api/health") {
        let body;
        try { body = JSON.parse(text); } catch { body = null; }
        if (body?.status !== "ok" || Object.keys(body).length !== 1) failures.push("health-response");
      }
    } catch {
      results.push({ path, status: 0, passed: false });
      failures.push(path);
    }
  }
  try {
    const cron = await fetch(new URL("/api/cron/daily-maintenance", base), { redirect: "manual", signal: AbortSignal.timeout(20000) });
    results.push({ path: "/api/cron/daily-maintenance", status: cron.status, passed: cron.status === 404 });
    if (cron.status !== 404) failures.push("cron-preview-block");
  } catch {
    failures.push("cron-preview-block");
  }
  return { results, failures: [...new Set(failures)], kakaoBrowserCheckRequired: true };
}
