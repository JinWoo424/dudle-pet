import type { NextConfig } from "next";

if ((process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") && (process.env.DATA_MODE === "mock" || process.env.USE_MOCK_DATA === "true")) {
  throw new Error("Production cannot use mock data. Set DATA_MODE=database.");
}

const nextConfig: NextConfig = {
  distDir: process.env.DUDLE_E2E === "1" ? ".next-e2e" : ".next",
  allowedDevOrigins: ["127.0.0.1"],
  poweredByHeader: false,
  outputFileTracingIncludes: { "/api/cron/daily-maintenance": ["./config/public-api/*.json", "./docs/api-samples/*.json"] },
  experimental: {
    typedEnv: true,
  },
};

export default nextConfig;
