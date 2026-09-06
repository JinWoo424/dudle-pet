import { describe,it,expect } from "vitest";
import { MoisHospitalAdapter } from "../mois";
import { contractSchema,redactSample } from "../contract";
import { normalizeImport,mapRegion,duplicateCandidate,dateOnly,sourceTimestamp } from "../../import-normalize";
import { developmentRegions } from "@/lib/regions";
import { fixtureContract,fixtureRecords } from "./fixture";
describe("explicit API contract and 100-record normalization fixture",()=>{
 const adapter=new MoisHospitalAdapter(fixtureContract);
 it("100 fixture records normalize without guessing source fields",async()=>{
  const normalized=await Promise.all(fixtureRecords.map(async raw=>normalizeImport(await adapter.normalize(raw),developmentRegions,"ISO_OFFSET")));
  expect(normalized).toHaveLength(100);expect(new Set(normalized.map(r=>r.public_source_id)).size).toBe(100);
  expect(normalized.every(r=>r.business_status==="OPEN"&&r.region_id===2&&r.geo_status==="MISSING")).toBe(true);
  expect(normalized[0].phone_normalized).toBe("0611230000");expect(normalized[0].latitude).toBeNull();
 });
 it("status mappings are explicit; unfamiliar status stays UNKNOWN",async()=>{
  expect((await adapter.normalize({...fixtureRecords[0],fixtureStatus:"closed"})).businessStatus).toBe("CLOSED");
  expect((await adapter.normalize({...fixtureRecords[0],fixtureStatus:"new-code"})).businessStatus).toBe("UNKNOWN");
 });
 it("rejects changed envelopes and error codes",async()=>{
  await expect(adapter.parse({result:"quota",total:100,items:[]})).rejects.toThrow();
  await expect(adapter.parse({result:"ok",total:100,data:[]})).rejects.toThrow();
 });
 it("requires mapped JSON fields to exist",async()=>{await expect(adapter.normalize({fixtureId:"1"})).rejects.toThrow("MAPPED_FIELD_MISSING");});
 it("rejects non-official endpoints",()=>{expect(contractSchema.safeParse({...fixtureContract,endpoint:"https://example.com/steal"}).success).toBe(false);});
 it("redacts credentials from saved samples",()=>{expect(redactSample({serviceKey:"secret",text:"echo secret"},"secret")).toEqual({serviceKey:"[REDACTED]",text:"echo [REDACTED]"});});
 it("validates province/city hierarchy",()=>{expect(mapRegion("광주광역시 여수시 학동",developmentRegions).status).toBe("REVIEW_REQUIRED");});
 it("never merges names alone",async()=>{
  const a=normalizeImport(await adapter.normalize(fixtureRecords[0]),developmentRegions,"ISO_OFFSET");
  expect(duplicateCandidate(a,{...a,public_source_id:"different-name-only",road_address:"전남 여수시 다른로 123",phone_normalized:null})).toBeNull();
  expect(duplicateCandidate(a,{...a,public_source_id:"different"} as typeof a)).toBe("NAME_ADDRESS");
  expect(duplicateCandidate({...a,public_source_id:"old",license_date:"2020-01-01"},{...a,public_source_id:"new",license_date:"2024-01-01"})).toBeNull();
 });
 it("rejects invalid calendar dates and missing timezone",()=>{expect(()=>dateOnly("20250230")).toThrow();expect(()=>sourceTimestamp("2025-01-01 12:00:00","ISO_OFFSET")).toThrow();});
});
