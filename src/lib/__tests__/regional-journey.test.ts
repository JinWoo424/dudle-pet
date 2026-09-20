import {describe,expect,it} from "vitest";
import {buildRegionalJourney,type RegionalPageCandidate} from "@/lib/regional-journey";
const origin="https://pet.dudle.co.kr";
const page=(page_type:string,path:string,region_slug="busan",region_name="부산광역시"):RegionalPageCandidate=>({page_type,canonical_url:origin+path,region_slug,region_name});
describe("regional journey",()=>{
 it("prioritizes service landings and removes the current page",()=>{
  const links=buildRegionalJourney([page("HOSPITAL_REGION","/hospital/busan"),page("PHARMACY_REGION","/pharmacy/busan"),page("FUNERAL_REGION","/funeral/busan"),page("COST_REGION","/cost/busan")],"busan","/hospital/busan",origin);
  expect(links.map(link=>link.path)).toEqual(["/pharmacy/busan","/funeral/busan","/cost/busan"]);
 });
 it("uses the nearest approved ancestor without manufacturing a page",()=>{
  const links=buildRegionalJourney([page("COST_REGION","/cost/busan"),page("COST_REGION","/cost/busan/r-26350","busan/r-26350","해운대구"),page("HOSPITAL_REGION","/hospital/ulsan","ulsan")],"busan/r-26350/r-1","/hospital/busan/r-26350/r-1/id",origin);
  expect(links).toEqual([expect.objectContaining({path:"/cost/busan/r-26350",scope:"parent",regionName:"해운대구"})]);
 });
});
