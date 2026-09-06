import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";

const fileArgument = process.argv.find((argument) => argument.startsWith("--file="));
const requestedFile = fileArgument?.slice("--file=".length);
const selectedFile = requestedFile || (existsSync(".local-secrets/vercel-preview.env") ? ".local-secrets/vercel-preview.env" : undefined);
let environment;
if (selectedFile) {
  if (!existsSync(selectedFile)) { console.error("ENV_FILE: MISSING"); process.exit(1); }
  try { environment = parseEnv(readFileSync(selectedFile, "utf8")); }
  catch { console.error("ENV_FILE: INVALID"); process.exit(1); }
} else {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  environment = process.env;
}

const scopeArgument = process.argv.find((argument) => argument.startsWith("--scope="));
const scope = scopeArgument?.split("=")[1] ?? (environment.VERCEL_ENV === "production" ? "production" : "preview");
if (!new Set(["preview", "production"]).has(scope)) {
  console.error("SCOPE: INVALID");
  process.exit(1);
}

const required = [
  "NEXT_PUBLIC_SITE_URL", "DATA_MODE", "DATABASE_URL", "DIRECT_URL", "SUPABASE_CA_CERT",
  "PUBLIC_DATA_SERVICE_KEY", "NEXT_PUBLIC_KAKAO_MAP_JS_KEY", "ADMIN_EMAIL", "ADMIN_PASSWORD_HASH",
  "ADMIN_SESSION_SECRET", "CRON_SECRET", "ADSENSE_ENABLED", "NEXT_PUBLIC_ADSENSE_CLIENT_ID",
];
const optional = ["NEXT_PUBLIC_GA_ID", "GOOGLE_SITE_VERIFICATION", "NAVER_SITE_VERIFICATION"];
let failed = false;

for (const name of [...required, ...optional]) {
  let status = environment[name] ? "SET" : "MISSING";
  if (name === "NEXT_PUBLIC_SITE_URL" && environment[name] !== "https://pet.dudle.co.kr") status = environment[name] ? "INVALID" : "MISSING";
  if (name === "DATA_MODE" && environment[name] !== "database") status = environment[name] ? "INVALID" : "MISSING";
  if (name === "ADSENSE_ENABLED" && environment[name] !== "false") status = environment[name] ? "INVALID" : "MISSING";
  console.log(`${name}: ${status}`);
  if (required.includes(name) && status !== "SET") failed = true;
}
console.log(`SCOPE: ${scope.toUpperCase()}`);
if (failed) process.exitCode = 1;
