import { inspectPreview } from "./lib/preview-qa.mjs";

const value = process.env.VERCEL_PREVIEW_URL;
if (!value) {
  console.error("VERCEL_PREVIEW_URL: MISSING");
  process.exit(1);
}
let url;
try { url = new URL(value); } catch { console.error("VERCEL_PREVIEW_URL: INVALID"); process.exit(1); }
if (url.protocol !== "https:" || !url.hostname.endsWith(".vercel.app")) {
  console.error("VERCEL_PREVIEW_URL: INVALID_PREVIEW_HOST");
  process.exit(1);
}
const report = await inspectPreview(url);
console.log(JSON.stringify({ checks: report.results, failures: report.failures, kakaoBrowserCheckRequired: report.kakaoBrowserCheckRequired }, null, 2));
if (report.failures.length) process.exitCode = 1;
