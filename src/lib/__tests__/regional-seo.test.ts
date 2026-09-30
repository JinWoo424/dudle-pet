import { describe, expect, it } from "vitest";
import { regionKeywordName, regionalAncestors, regionalDescription, regionalPrimaryKeyword, regionalSeoQuality, regionalTitle, regionalVisitGuide } from "@/lib/regional-seo";

const region={id:53,parentId:2,level:"CITY" as const,name:"여수시",shortName:"여수",fullSlug:"jeonnam-gwangju/yeosu"};
const stats={total:15,coordinateCount:15,phoneCount:12,addressCount:15,averageQuality:88,sourceDate:"2026-07-24",syncedAt:"2026-09-05"};

describe("regional SEO content",()=>{
 it("uses a natural regional keyword",()=>{
  expect(regionKeywordName(region)).toBe("여수");
  expect(regionalPrimaryKeyword("ANIMAL_HOSPITAL",region)).toBe("여수 동물병원");
 });
 it("keeps an official district suffix when it is the SEO name",()=>{
  expect(regionKeywordName({...region,name:"강남구",shortName:"강남",seoName:"강남구"})).toBe("강남구");
 });
 it("starts the title with the primary keyword and uses actual counts",()=>{
  expect(regionalTitle("ANIMAL_HOSPITAL",region,stats)).toBe("여수 동물병원 찾기 | 15곳 지도·전화·병원 정보");
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
 it.each(["ANIMAL_HOSPITAL", "ANIMAL_PHARMACY", "PET_FUNERAL"] as const)("applies factual visit guidance to every region for %s",type=>{
  for(const shortName of ["서울","부산","청주","여수","제주"]){
   const target={...region,shortName};
   const guide=regionalVisitGuide(type,target,stats);
   expect(guide.heading).toContain(shortName);
   expect(guide.coverage).toContain("전화번호 확인 12곳");
   expect(guide.coverage).toContain("좌표가 없는 시설도 목록");
   expect(regionalDescription(type,target,stats)).toContain("공식 데이터 기준일 2026-07-24");
   expect(guide.steps.join(" ")).toMatch(/전화로 확인|직접 확인/);
  }
 });
 it("does not claim missing phone or coordinates exist",()=>{
  const missing={...stats,phoneCount:0,coordinateCount:0,addressCount:0};
  expect(regionalDescription("ANIMAL_PHARMACY",region,missing)).toContain("전화번호는 시설별 확인 필요");
  expect(regionalVisitGuide("PET_FUNERAL",region,missing).coverage).toContain("지도 좌표 확인 0곳");
 });
 it("links all real ancestors in order without guessing missing regions",()=>{
  const province={...region,id:1,parentId:undefined,level:"PROVINCE" as const,name:"충청북도",fullSlug:"chungbuk"};
  const city={...region,id:2,parentId:1,name:"청주시",fullSlug:"chungbuk/r-43110"};
  const district={...region,id:3,parentId:2,level:"DISTRICT" as const};
  expect(regionalAncestors(district,[province,city,district])).toEqual([province,city]);
  expect(regionalAncestors(district,[district])).toEqual([]);
  expect(regionalAncestors(null,[province])).toEqual([]);
  expect(regionalAncestors({...city,parentId:2},[city])).toEqual([]);
 });
});
