import {describe,expect,it} from "vitest";
import {normalizeRelatedSeoLinks} from "@/lib/related-seo-links";
const origin="https://pet.dudle.co.kr";
describe("related SEO links",()=>{
 it("keeps approved same-origin destinations with distinct labels",()=>{
  const links=normalizeRelatedSeoLinks([{canonical_url:`${origin}/hospital/busan`,page_type:"HOSPITAL_REGION"},{canonical_url:`${origin}/cost/busan/xray`,page_type:"COST_ITEM"}],origin);
  expect(links).toEqual([{path:"/hospital/busan",label:"동물병원 목록"},{path:"/cost/busan/xray",label:"엑스선 촬영비와 판독료 통계"}]);
 });
 it("rejects external, filtered, unknown and duplicate destinations",()=>{
  expect(normalizeRelatedSeoLinks([{canonical_url:`${origin}/cost/busan`,page_type:"COST_REGION"},{canonical_url:`${origin}/cost/busan`,page_type:"COST_REGION"},{canonical_url:"https://example.com/cost/busan",page_type:"COST_REGION"},{canonical_url:`${origin}/cost/busan?year=2025`,page_type:"COST_REGION"}],origin)).toEqual([{path:"/cost/busan",label:"동물병원 진료비 통계"}]);
 });
});
