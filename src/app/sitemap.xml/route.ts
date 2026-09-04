import { sitemapKinds, xmlResponse } from "@/lib/sitemap";
export function GET() { const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pet.dudle.co.kr"; return xmlResponse(`<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapKinds.map((kind) => `<sitemap><loc>${base}/sitemaps/${kind}.xml</loc></sitemap>`).join("")}</sitemapindex>`); }

