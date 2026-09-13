import { describe, expect, it } from "vitest";
import { buildRegionalJourney, type RegionalPageCandidate } from "../regional-journey";

const origin="https://pet.dudle.co.kr";
function page(type:string,path:string,slug="busan",name="부산광역시"):RegionalPageCandidate {
 return {page_type:type,canonical_url:origin+path,region_slug:slug,region_name:name};
}
describe("regional journey",()=>{
 it("keeps services ahead of cost items and removes self links",()=>{
  const rows=[...Array.from({length:9},()=>page("COST_ITEM","/cost/busan/xray")),page("COST_REGION","/cost/busan"),page("HOSPITAL_REGION","/hospital/busan"),page("PHARMACY_REGION","/pharmacy/busan"),page("FUNERAL_REGION","/funeral/busan")];
  const links=buildRegionalJourney(rows,"busan","/hospital/busan",origin);
  expect(links.map(l=>l.path)).toEqual(["/pharmacy/busan","/funeral/busan","/cost/busan","/cost/busan/xray"]);
 });
 it("uses nearest approved ancestor per service with explicit region labels",()=>{
  const rows=[page("COST_REGION","/cost/busan"),page("COST_REGION","/cost/busan/r-26350","busan/r-26350","해운대구"),page("PHARMACY_REGION","/pharmacy/busan"),page("HOSPITAL_REGION","/hospital/seoul","seoul","서울특별시")];
  const links=buildRegionalJourney(rows,"busan/r-26350/r-1","/hospital/busan/r-26350/r-1/id",origin);
  expect(links).toHaveLength(2);
  expect(links.find(l=>l.pageType==="COST_REGION")).toMatchObject({path:"/cost/busan/r-26350",regionName:"해운대구",scope:"parent"});
  expect(links.every(l=>l.scope==="parent")).toBe(true);
 });
 it("does not manufacture unknown treatments, services or adjacent cities",()=>{
  expect(buildRegionalJourney([page("COST_ITEM","/cost/busan/neutering"),page("HOSPITAL_REGION","/hospital/ulsan","ulsan")],"busan","/cost/busan",origin)).toEqual([]);
 });
 it("caps actions at eight and excludes external destinations",()=>{
  const rows=[...['xray','mri','ct','ultrasound','cbc','hospitalization','initial-consultation','followup-consultation','rabies-vaccine'].map(item=>page("COST_ITEM",`/cost/busan/${item}`)),{...page("COST_REGION","/cost/busan"),canonical_url:"https://example.org/cost/busan"}];
  expect(buildRegionalJourney(rows,"busan","/hospital/busan",origin)).toHaveLength(8);
 });
});
