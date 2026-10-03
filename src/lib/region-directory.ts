export const directoryCategories = {
  HOSPITAL_REGION: { prefix: "hospital", label: "동물병원" },
  PHARMACY_REGION: { prefix: "pharmacy", label: "동물약국" },
  FUNERAL_REGION: { prefix: "funeral", label: "반려동물 장례식장" },
  COST_REGION: { prefix: "cost", label: "동물병원 진료비" },
} as const;

export interface RegionDirectoryRow {
  canonical_url: string;
  page_type: string;
  region_slug: string;
  region_name: string;
  province_name: string;
}

export function buildRegionDirectory(rows: RegionDirectoryRow[], origin: string) {
  const groups = new Map<string, { name: string; links: { href: string; label: string }[] }>();
  const seen = new Set<string>();
  for (const row of rows) {
    if (!Object.hasOwn(directoryCategories, row.page_type)) continue;
    const category = directoryCategories[row.page_type as keyof typeof directoryCategories];
    if (!/^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/.test(row.region_slug)) continue;
    let url: URL;
    try { url = new URL(row.canonical_url); } catch { continue; }
    const expectedPath = `/${category.prefix}/${row.page_type === "COST_REGION" ? costRegionSlug(row.region_slug) : row.region_slug}`;
    if (url.origin !== new URL(origin).origin || url.username || url.password || url.search || url.hash || url.pathname !== expectedPath || seen.has(expectedPath)) continue;
    if (!row.region_name.trim() || !row.province_name.trim()) continue;
    seen.add(expectedPath);
    const key = row.region_slug.split("/")[0];
    const group = groups.get(key) ?? { name: row.province_name, links: [] };
    group.links.push({ href: expectedPath, label: `${row.region_name} ${category.label}` });
    groups.set(key, group);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([slug, group]) => ({
    slug, ...group, links: group.links.sort((a, b) => a.label.localeCompare(b.label, "ko")),
  }));
}
import { costRegionSlug } from "@/data/fee-catalog";
