import { normalizeRelatedSeoLinks } from "./related-seo-links";

export interface RegionalPageCandidate {
  canonical_url: string;
  page_type: string;
  region_slug: string;
  region_name: string;
}
export interface RegionalJourneyLink {
  path: string;
  label: string;
  regionName: string;
  scope: "current" | "parent";
  pageType: string;
}
const coreTypes = ["HOSPITAL_REGION", "PHARMACY_REGION", "FUNERAL_REGION", "COST_REGION"];
const features = ["HOSPITAL_24H", "HOSPITAL_NIGHT", "HOSPITAL_EXOTIC"];
function priority(type: string) {
  const core = coreTypes.indexOf(type);
  return core >= 0 ? core : features.includes(type) ? 4 : 5;
}

/** Candidates are existing approved pages, never manufactured from keywords. */
export function buildRegionalJourney(rows: readonly RegionalPageCandidate[], slug: string, currentPath: string, origin: string): RegionalJourneyLink[] {
  const eligible = rows.filter(row => row.region_slug === slug || slug.startsWith(row.region_slug + "/"));
  const ordered = [...eligible].sort((a, b) => priority(a.page_type) - priority(b.page_type)
    || b.region_slug.split("/").length - a.region_slug.split("/").length
    || a.canonical_url.localeCompare(b.canonical_url));
  const identities = new Set<string>();
  const paths = new Set<string>();
  const links: RegionalJourneyLink[] = [];
  for (const row of ordered) {
    const link = normalizeRelatedSeoLinks([row], origin)[0];
    if (!link) continue;
    const identity = row.page_type === "COST_ITEM" ? `COST_ITEM:${link.path.split("/").at(-1)}` : row.page_type;
    if (identities.has(identity)) continue;
    identities.add(identity);
    // Do not replace a current-page link with a redundant ancestor of the same kind.
    if (link.path === currentPath || paths.has(link.path)) continue;
    paths.add(link.path);
    links.push({ ...link, regionName: row.region_name, scope: row.region_slug === slug ? "current" : "parent", pageType: row.page_type });
    if (links.length === 8) break;
  }
  return links;
}
