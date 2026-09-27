import { describe, expect, it } from "vitest";
import { productionUrl, facilityDetailUrl, batches, locations } from "../../../scripts/indexnow-lib.mjs";

describe("IndexNow submission boundaries", () => {
  it("rejects external, Preview and query URLs", () => {
    for (const url of ["https://example.com/", "https://pet.dudle.co.kr/?page=2", "https://pet.dudle.co.kr/#x", "http://pet.dudle.co.kr/", "https://user@pet.dudle.co.kr/"]) expect(() => productionUrl(url)).toThrow();
  });
  it("selects facility details but not region, cost or admin pages", () => {
    expect(facilityDetailUrl("https://pet.dudle.co.kr/hospital/chungbuk/r-43110/bbaf2b43-4ea8-4bb6-928d-dbf01b029120")).toBe(true);
    for (const path of ["/hospital/busan", "/cost/busan", "/admin"]) expect(facilityDetailUrl(`https://pet.dudle.co.kr${path}`)).toBe(false);
  });
  it("deduplicates and respects the 10000 URL request limit", () => {
    const urls = Array.from({ length: 10001 }, (_, i) => `https://pet.dudle.co.kr/hospital/${i}`);
    expect(batches([...urls, urls[0]]).map((batch: string[]) => batch.length)).toEqual([10000, 1]);
    expect(() => batches(urls, 10001)).toThrow();
  });
  it("validates locations from sitemap XML", () => {
    expect(locations("<url><loc>https://pet.dudle.co.kr/hospital/busan</loc></url>")).toEqual(["https://pet.dudle.co.kr/hospital/busan"]);
    expect(() => locations("<loc>https://other.example/</loc>")).toThrow();
  });
});
