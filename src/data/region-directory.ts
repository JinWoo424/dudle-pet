import { unstable_cache } from "next/cache";
import { getSql } from "@/db/connection";
import { dataMode } from "@/lib/data-mode";
import { buildRegionDirectory, type RegionDirectoryRow } from "@/lib/region-directory";

const databaseDirectory = unstable_cache(async (origin: string) => {
  const rows = await getSql()<RegionDirectoryRow[]>`
    SELECT s.canonical_url, s.page_type, r.full_slug AS region_slug,
      r.name AS region_name, p.name AS province_name
    FROM seo_pages s
    JOIN regions r ON r.id=s.region_id AND r.is_active
    JOIN regions p ON p.full_slug=split_part(r.full_slug,'/',1) AND p.is_active AND p.level='PROVINCE'
    WHERE s.seo_status='SEO_READY' AND NOT s.manual_hold
      AND s.page_type IN ('HOSPITAL_REGION','PHARMACY_REGION','FUNERAL_REGION','COST_REGION')
    ORDER BY r.full_slug, s.page_type`;
  return buildRegionDirectory(rows, origin);
}, ["approved-region-directory-v1"], { revalidate: 3600, tags: ["regions", "seo"] });

export async function regionDirectory() {
  if (dataMode() === "mock") return [];
  return databaseDirectory(process.env.NEXT_PUBLIC_SITE_URL || "https://pet.dudle.co.kr");
}
