import { sitemapKinds, urlsForSitemap, xmlResponse, type SitemapKind } from "@/lib/sitemap";
export async function GET(_request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const raw = (await params).kind; const kind = raw.replace(/\.xml$/, "") as SitemapKind;
  if (!sitemapKinds.includes(kind)) return new Response("Not found", { status: 404 });
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pet.dudle.co.kr"; const lastmod = "2026-09-01";
  return xmlResponse(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${(await urlsForSitemap(kind)).map((path) => `<url><loc>${base}${path}</loc><lastmod>${lastmod}</lastmod></url>`).join("")}</urlset>`);
}
