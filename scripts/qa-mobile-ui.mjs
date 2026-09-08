import { chromium } from "@playwright/test";

const baseUrl = (process.env.MOBILE_QA_URL ?? "http://localhost:3010").replace(/\/$/, "");
const widths = [320, 360, 375, 390, 412, 430, 768, 1024, 1440];
const routes = [
  "/",
  "/hospital/busan",
  "/hospital/jeonnam-gwangju/yeosu",
  "/pharmacy/busan",
  "/funeral/busan",
  "/cost/busan",
  "/cost/jeonnam-gwangju/yeosu",
];
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const extraHTTPHeaders = bypass
  ? { "x-vercel-protection-bypass": bypass, "x-vercel-set-bypass-cookie": "true" }
  : undefined;

const browser = await chromium.launch({ headless: true });
const failures = [];
const rows = [];

try {
  for (const width of widths) {
    const context = await browser.newContext({
      viewport: { width, height: width <= 430 ? 844 : 900 },
      extraHTTPHeaders,
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
      globalThis.__dudleLayoutShift = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) globalThis.__dudleLayoutShift += entry.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
    });

    for (const route of routes) {
      const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await page.waitForTimeout(700);
      const status = response?.status() ?? 0;
      const metrics = await page.evaluate(() => {
        const root = document.documentElement;
        const viewportWidth = root.clientWidth;
        const overflow = Math.max(root.scrollWidth, document.body.scrollWidth) - viewportWidth;
        const outside = [...document.querySelectorAll("header, main, footer, .card, .map-frame, .map-placeholder, .cost-table-wrap, .ad-slot")]
          .filter((node) => {
            const rect = node.getBoundingClientRect();
            return rect.width > 0 && (rect.left < -1 || rect.right > viewportWidth + 1);
          })
          .slice(0, 5)
          .map((node) => `${node.tagName.toLowerCase()}.${[...node.classList].join(".")}`);
        const targetSelector = [
          "button",
          ".mobile-nav summary",
          ".primary-button",
          ".secondary-button",
          ".facility-actions a",
          ".filter-bar a",
          ".fee-selectors select",
          ".fee-selectors button",
          "a[href^='tel:']",
        ].join(",");
        const shortTargets = [...document.querySelectorAll(targetSelector)]
          .filter((node) => {
            const style = getComputedStyle(node);
            const rect = node.getBoundingClientRect();
            return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44);
          })
          .slice(0, 5)
          .map((node) => `${node.tagName.toLowerCase()}.${[...node.classList].join(".")}:${Math.round(node.getBoundingClientRect().width)}x${Math.round(node.getBoundingClientRect().height)}`);
        return {
          overflow,
          outside,
          shortTargets,
          layoutShift: Number(globalThis.__dudleLayoutShift ?? 0),
          hasHeader: Boolean(document.querySelector("header")),
          hasFooter: Boolean(document.querySelector("footer")),
          hasMain: Boolean(document.querySelector("main")),
        };
      });
      const record = { width, route, status, ...metrics };
      rows.push(record);
      if (status >= 400 || metrics.overflow > 1 || metrics.outside.length || metrics.shortTargets.length || !metrics.hasHeader || !metrics.hasFooter || !metrics.hasMain) {
        failures.push(record);
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
}

const maxLayoutShift = Math.max(...rows.map((row) => row.layoutShift), 0);
console.log(`Mobile UI QA: ${rows.length} page/viewport checks, max CLS ${maxLayoutShift.toFixed(4)}`);
if (failures.length) {
  for (const failure of failures) {
    console.error(JSON.stringify(failure));
  }
  process.exitCode = 1;
} else {
  console.log("PASS: HTTP, viewport overflow, component bounds, 44px controls, header/main/footer");
}
