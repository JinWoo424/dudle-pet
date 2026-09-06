import { beforeEach,describe,expect,it,vi } from "vitest";
import { officialFeeItems } from "@/data/fee-catalog";
const sql=vi.fn();
vi.mock("@/db/connection",()=>({getSql:()=>sql}));
import { previewFeeImport } from "@/data/fee-import";

function officialFile(){return {sourceName:"농림축산식품부 동물병원 진료비용 현황 조사 및 공개",sourceUrl:"https://animalclinicfee.or.kr/info/payInfo.do",sourceDate:"2025-12-22",surveyYear:2025,rows:officialFeeItems.map(item=>({regionLevel:"NATIONAL",surveyRegionCode:"KR",categoryCode:item.categoryCode,itemCode:item.itemCode,itemName:item.itemName,...item.dimensions[0],minimumPrice:"1,000원",medianPrice:2000,averagePrice:2500,maximumPrice:3000,sampleCount:null}))};}
describe("fee import preview",()=>{
 beforeEach(()=>{sql.mockReset();sql.mockResolvedValueOnce([]).mockResolvedValueOnce([{exists:false}]);});
 it("accepts the complete official item catalog without inventing dimensions",async()=>{const result=await previewFeeImport(JSON.stringify(officialFile()));expect(result.canImport).toBe(true);expect(result.totalRows).toBe(20);expect(result.missingItems).toEqual([]);expect(result.priceParsingErrors).toBe(0);});
 it("preserves missing prices as null, never zero",async()=>{const input=officialFile();input.rows[0].minimumPrice="없음";const result=await previewFeeImport(JSON.stringify(input));expect(result.rows[0].minimumPrice).toBeNull();expect(result.priceParsingErrors).toBe(0);});
 it("blocks invalid ranges, duplicates and missing official items",async()=>{const input=officialFile();input.rows=[input.rows[0],{...input.rows[0],minimumPrice:"4,000원",maximumPrice:3000}];const result=await previewFeeImport(JSON.stringify(input));expect(result.canImport).toBe(false);expect(result.duplicateKeys).toBe(1);expect(result.rangeErrors).toBe(1);expect(result.missingItems.length).toBe(19);});
});
