import { officialFeeItemByCode } from "@/data/fee-catalog";

const pageLabels: Record<string, string> = {
  HOSPITAL_REGION: "동물병원 목록",
  PHARMACY_REGION: "동물약국 목록",
  FUNERAL_REGION: "반려동물 장례식장 목록",
  COST_REGION: "동물병원 진료비 통계",
  HOSPITAL_24H: "확인된 24시간 동물병원",
  HOSPITAL_NIGHT: "확인된 야간 동물병원",
  HOSPITAL_EXOTIC: "확인된 특수동물 병원",
};

// Input rows must already be SEO_READY and not on manual hold.
export function normalizeRelatedSeoLinks(
  rows: readonly { canonical_url: string; page_type: string }[],
  origin: string,
) {
  const base = new URL(origin);
  const seen = new Set<string>();
  return rows.flatMap(row => {
    try {
      const url = new URL(row.canonical_url);
      if (url.origin !== base.origin || url.search || url.hash || url.username || url.password || seen.has(url.pathname)) return [];
      const item = row.page_type === "COST_ITEM"
        ? officialFeeItemByCode.get(url.pathname.split("/").at(-1) ?? "")
        : undefined;
      const label = row.page_type === "COST_ITEM"
        ? item && `${item.itemName} 통계`
        : pageLabels[row.page_type];
      if (!label) return [];
      seen.add(url.pathname);
      return [{ path: url.pathname, label }];
    } catch {
      return [];
    }
  });
}
