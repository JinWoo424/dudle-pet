import { describe, expect, it } from "vitest";
import { regionKeywordName, regionalDescription, regionalPrimaryKeyword, regionalSeoQuality, regionalTitle } from "@/lib/regional-seo";

const region={id:53,parentId:2,level:"CITY" as const,name:"여수시",shortName:"여수",fullSlug:"jeonnam-gwangju/yeosu"};
const stats={total:15,coordinateCount:15,phoneCount:12,addressCount:15,averageQuality:88,sourceDate:"2026-07-24",syncedAt:"2026-09-05"};

describe("regional SEO content",()=>{
 it("uses a natural regional keyword",()=>{
  expect(regionKeywordName(region)).toBe("여수");
  expect(regionalPrimaryKeyword("ANIMAL_HOSPITAL",region)).toBe("여수 동물병원");
 });
 it("starts the title with the primary keyword and uses actual counts",()=>{
  expect(regionalTitle("ANIMAL_HOSPITAL",region,stats)).toBe("여수 동물병원 15곳 | 지도·전화·병원 정보");
 });
 it("builds a factual description from measured fields",()=>{
  const description=regionalDescription("ANIMAL_PHARMACY",region,stats);
  expect(description).toContain("여수 동물약국 15곳");
  expect(description).toContain("지도 표시 15곳");
  expect(description).toContain("2026-07-24");
 });
 it("scores quality without exceeding 100",()=>{
  expect(regionalSeoQuality(stats)).toBeGreaterThanOrEqual(80);
  expect(regionalSeoQuality(stats)).toBeLessThanOrEqual(100);
 });
});
