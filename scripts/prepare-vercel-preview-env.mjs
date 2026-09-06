import { randomBytes, X509Certificate } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { parseEnv } from "node:util";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const target = ".local-secrets/vercel-preview.env";
const existing = existsSync(target) ? parseEnv(readFileSync(target, "utf8")) : {};
const sourceNames = ["DATABASE_URL", "DIRECT_URL", "PUBLIC_DATA_SERVICE_KEY", "NEXT_PUBLIC_KAKAO_MAP_JS_KEY"];
const sourceReady = sourceNames.every((name) => Boolean(process.env[name]));
const caPath = process.env.SUPABASE_CA_CERT_PATH;
let ca = "";
let caValid = false;

if (caPath && existsSync(caPath)) {
  try {
    ca = readFileSync(caPath, "utf8").trim();
    const blocks = ca.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g) ?? [];
    const now = Date.now();
    caValid = blocks.length > 0 && blocks.map((block) => new X509Certificate(block)).every((certificate) => {
      const from = Date.parse(certificate.validFrom);
      const to = Date.parse(certificate.validTo);
      return Number.isFinite(from) && Number.isFinite(to) && from <= now && now <= to;
    });
  } catch {
    caValid = false;
  }
}

if (!sourceReady || !caValid) {
  console.log(`SOURCE_ENV_READY: ${sourceReady ? "YES" : "NO"}`);
  console.log(`SUPABASE_CA_READY: ${caValid ? "YES" : "NO"}`);
  process.exit(1);
}

const values = {
  NEXT_PUBLIC_SITE_URL: "https://pet.dudle.co.kr",
  DATA_MODE: "database",
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,
  SUPABASE_CA_CERT: ca,
  PUBLIC_DATA_SERVICE_KEY: process.env.PUBLIC_DATA_SERVICE_KEY,
  NEXT_PUBLIC_KAKAO_MAP_JS_KEY: process.env.NEXT_PUBLIC_KAKAO_MAP_JS_KEY,
  ADMIN_EMAIL: existing.ADMIN_EMAIL || process.env.ADMIN_EMAIL || "",
  ADMIN_PASSWORD_HASH: existing.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD_HASH || "",
  ADMIN_SESSION_SECRET: existing.ADMIN_SESSION_SECRET || randomBytes(32).toString("base64url"),
  CRON_SECRET: existing.CRON_SECRET || randomBytes(32).toString("base64url"),
  ADSENSE_ENABLED: "false",
  NEXT_PUBLIC_ADSENSE_CLIENT_ID: "ca-pub-7368372468718077",
  NEXT_PUBLIC_GA_ID: existing.NEXT_PUBLIC_GA_ID || process.env.NEXT_PUBLIC_GA_ID || "",
  GOOGLE_SITE_VERIFICATION: existing.GOOGLE_SITE_VERIFICATION || process.env.GOOGLE_SITE_VERIFICATION || "",
  NAVER_SITE_VERIFICATION: existing.NAVER_SITE_VERIFICATION || process.env.NAVER_SITE_VERIFICATION || "",
};

const quoted = (value) => `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
const body = Object.entries(values).map(([name, value]) => `${name}=${quoted(value)}`).join("\n") + "\n";
mkdirSync(dirname(target), { recursive: true });
writeFileSync(`${target}.tmp`, body, { encoding: "utf8", mode: 0o600 });
renameSync(`${target}.tmp`, target);
console.log("VERCEL_PREVIEW_ENV_CREATED: YES");
console.log("SUPABASE_CA_CERT: SET");
console.log("ADMIN_SESSION_SECRET: SET");
console.log("CRON_SECRET: SET");
console.log(`ADMIN_EMAIL: ${values.ADMIN_EMAIL ? "SET" : "MISSING"}`);
console.log(`ADMIN_PASSWORD_HASH: ${values.ADMIN_PASSWORD_HASH ? "SET" : "MISSING"}`);
