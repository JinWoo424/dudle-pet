import { inspectPreview } from "./lib/preview-qa.mjs";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";

const previewEnvFile = ".local-secrets/vercel-preview.env";
let previewEnvironment = {};
if (existsSync(previewEnvFile)) {
  try { previewEnvironment = parseEnv(readFileSync(previewEnvFile, "utf8")); }
  catch { console.error("PREVIEW_ENV_FILE: INVALID"); process.exit(1); }
}

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
const protectionBypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET || previewEnvironment.VERCEL_AUTOMATION_BYPASS_SECRET;
if (!protectionBypassSecret) {
  console.error("VERCEL_AUTOMATION_BYPASS_SECRET: MISSING");
  process.exit(1);
}
const report = await inspectPreview(url, { protectionBypassSecret });
console.log(JSON.stringify({ checks: report.results, failures: report.failures, kakaoBrowserCheckRequired: report.kakaoBrowserCheckRequired }, null, 2));
if (report.failures.length) process.exitCode = 1;
