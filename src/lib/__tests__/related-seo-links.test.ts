import { describe, expect, it } from "vitest";
import { normalizeRelatedSeoLinks } from "../related-seo-links";

const origin = "https://pet.dudle.co.kr";
describe("related SEO link labels", () => {
  it("distinguishes category pages and actual fee items", () => {
    const result = normalizeRelatedSeoLinks([
      { canonical_url: `${origin}/hospital/busan`, page_type: "HOSPITAL_REGION" },
      { canonical_url: `${origin}/pharmacy/busan`, page_type: "PHARMACY_REGION" },
      { canonical_url: `${origin}/funeral/busan`, page_type: "FUNERAL_REGION" },
      { canonical_url: `${origin}/cost/busan`, page_type: "COST_REGION" },
      { canonical_url: `${origin}/cost/busan/xray`, page_type: "COST_ITEM" },
      { canonical_url: `${origin}/cost/busan/mri`, page_type: "COST_ITEM" },
    ], origin);
    expect(result).toHaveLength(6);
    expect(new Set(result.map(link => link.label)).size).toBe(6);
    expect(result[4].label).toBe("엑스선 촬영비와 판독료 통계");
    expect(result[5].label).toBe("자기공명영상검사(MRI)비와 판독료 통계");
  });
  it("excludes external, filtered, unknown and duplicate destinations", () => {
    const result = normalizeRelatedSeoLinks([
      { canonical_url: `${origin}/cost/busan`, page_type: "COST_REGION" },
      { canonical_url: `${origin}/cost/busan`, page_type: "COST_REGION" },
      { canonical_url: "https://other.vercel.app/cost/busan", page_type: "COST_REGION" },
      { canonical_url: `${origin}/cost/busan?year=2025`, page_type: "COST_REGION" },
      { canonical_url: `${origin}/cost/busan#prices`, page_type: "COST_REGION" },
      { canonical_url: `${origin}/cost/busan/not-an-item`, page_type: "COST_ITEM" },
      { canonical_url: `${origin}/admin`, page_type: "ADMIN" },
      { canonical_url: "not a url", page_type: "COST_REGION" },
    ], origin);
    expect(result).toEqual([{path: "/cost/busan", label: "동물병원 진료비 통계"}]);
  });
});
