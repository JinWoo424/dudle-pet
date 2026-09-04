export type PageType = "HOSPITAL_REGION" | "HOSPITAL_24H" | "HOSPITAL_NIGHT" | "HOSPITAL_EXOTIC" | "PHARMACY_REGION" | "FUNERAL_REGION" | "COST_REGION" | "COST_ITEM" | "FACILITY_DETAIL" | "SEARCH" | "NEARBY" | "ADMIN";

export function evaluateSeo(input: { pageType: PageType; resultCount: number; hasRequiredData?: boolean }) {
  const thresholds: Partial<Record<PageType, number>> = { HOSPITAL_REGION: 5, HOSPITAL_24H: 2, HOSPITAL_NIGHT: 3, HOSPITAL_EXOTIC: 3, PHARMACY_REGION: 5, FUNERAL_REGION: 2 };
  if (["SEARCH", "NEARBY", "ADMIN"].includes(input.pageType)) return "NOINDEX_MANUAL" as const;
  if (!input.hasRequiredData && ["COST_REGION", "COST_ITEM", "FACILITY_DETAIL"].includes(input.pageType)) return "NOINDEX_LOW_DATA" as const;
  return input.resultCount >= (thresholds[input.pageType] ?? 1) ? "SEO_READY" as const : "NOINDEX_LOW_DATA" as const;
}

export function monetizationFor(input: { seoStatus: ReturnType<typeof evaluateSeo>; qualityScore: number; pageType: PageType }) {
  if (input.seoStatus !== "SEO_READY" || ["SEARCH", "NEARBY", "ADMIN"].includes(input.pageType)) return "OFF" as const;
  if (input.qualityScore >= 75) return "FULL" as const;
  if (input.qualityScore >= 55) return "LIMITED" as const;
  return "OFF" as const;
}

export function stabilizeSeoStatus(input: { current: "SEO_READY" | "NOINDEX_LOW_DATA"; resultCount: number; enterAt: number; retainAt: number; zeroDays: number }) {
  if (input.current === "SEO_READY") return input.resultCount >= input.retainAt || input.zeroDays < 14 ? "SEO_READY" as const : "NOINDEX_LOW_DATA" as const;
  return input.resultCount >= input.enterAt ? "SEO_READY" as const : "NOINDEX_LOW_DATA" as const;
}

export function calculatePageQuality(flags: { enoughResults: boolean; coordinates: boolean; phone: boolean; verification: boolean; map: boolean; nearby: boolean; fees: boolean; sourceDate: boolean; internalLinks: boolean; uniqueFeature: boolean }) {
  return (flags.enoughResults ? 20 : 0) + (flags.coordinates ? 10 : 0) + (flags.phone ? 10 : 0) + (flags.verification ? 15 : 0) + (flags.map ? 10 : 0) + (flags.nearby ? 10 : 0) + (flags.fees ? 10 : 0) + (flags.sourceDate ? 5 : 0) + (flags.internalLinks ? 5 : 0) + (flags.uniqueFeature ? 5 : 0);
}

