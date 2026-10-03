import { describe, expect, it } from "vitest";
import { buildRegionDirectory, type RegionDirectoryRow } from "@/lib/region-directory";

const origin = "https://pet.dudle.co.kr";
const row: RegionDirectoryRow = { canonical_url: origin + "/hospital/busan", page_type: "HOSPITAL_REGION", region_slug: "busan", region_name: "부산광역시", province_name: "부산광역시" };
describe("approved regional discovery", () => {
  it("groups actual approved paths and labels without manufacturing destinations", () => {
    const groups = buildRegionDirectory([row, { ...row, canonical_url: origin + "/cost/busan/h aeundae", page_type: "COST_REGION" }, { ...row, canonical_url: origin + "/cost/busan/haeundae", page_type: "COST_REGION", region_slug: "busan/haeundae", region_name: "해운대구" }], origin);
    expect(groups).toHaveLength(1);
    expect(groups[0].links).toEqual(expect.arrayContaining([{ href: "/hospital/busan", label: "부산광역시 동물병원" }, { href: "/cost/busan/haeundae", label: "해운대구 동물병원 진료비" }]));
    expect(groups[0].links).toHaveLength(2);
  });
  it("deduplicates URLs", () => expect(buildRegionDirectory([row, row], origin)[0].links).toHaveLength(1));
  it("uses the existing official-cost canonical mapping, not a guessed new slug", () => {
    const groups = buildRegionDirectory([{ ...row, canonical_url: origin + "/cost/chungbuk/cheongju", page_type: "COST_REGION", region_slug: "chungbuk/r-43110", region_name: "청주시", province_name: "충청북도" }], origin);
    expect(groups[0].links).toEqual([{ href: "/cost/chungbuk/cheongju", label: "청주시 동물병원 진료비" }]);
  });
  it.each(["https://example.com/hospital/busan", origin + "/hospital/busan?sort=name", origin + "/hospital/busan#map", "https://user:pass@pet.dudle.co.kr/hospital/busan", origin + "/hospital/busan/24h", origin + "/hospital/seoul", "invalid"])("rejects unexpected URL %s", canonical_url => {
    expect(buildRegionDirectory([{ ...row, canonical_url }], origin)).toEqual([]);
  });
  it("rejects detail/feature types and missing or invalid regions", () => {
    expect(buildRegionDirectory([{ ...row, page_type: "FACILITY_DETAIL" }, { ...row, region_slug: "../busan" }, { ...row, province_name: "" }], origin)).toEqual([]);
  });
});
