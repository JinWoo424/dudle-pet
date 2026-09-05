import { describe,it,expect,afterEach,vi } from "vitest";
import { sameOrigin,limitedForm } from "../request-security";
import { queryFacilities,listFeeStatistics } from "@/data/repository";
import { POST as report } from "@/app/api/reports/route";
afterEach(()=>vi.unstubAllEnvs());
describe("request safety and missing database",()=>{
 it("requires exact same origin",()=>{expect(sameOrigin(new Request("https://pet.dudle.co.kr/api/reports",{headers:{origin:"https://pet.dudle.co.kr"}}))).toBe(true);expect(sameOrigin(new Request("https://pet.dudle.co.kr/api/reports",{headers:{origin:"https://evil.example"}}))).toBe(false);});
 it("limits form input",async()=>{await expect(limitedForm(new Request("https://example.com",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:"message="+"x".repeat(9000)}))).rejects.toThrow("INPUT_TOO_LARGE");});
 it("missing production DB never returns fixture facilities or fees",async()=>{
  vi.stubEnv("DATA_MODE","database");vi.stubEnv("DATABASE_URL","");vi.stubEnv("NODE_ENV","production");
  await expect(queryFacilities()).rejects.toThrow("Database is not configured");
  await expect(listFeeStatistics()).rejects.toThrow("Database is not configured");
 });
 it("reports cannot pretend to save without database",async()=>{
  vi.stubEnv("DATABASE_URL","");vi.stubEnv("ADMIN_SESSION_SECRET","test-only-rate-limit-secret-32-characters");
  const response=await report(new Request("https://pet.dudle.co.kr/api/reports",{method:"POST",headers:{origin:"https://pet.dudle.co.kr","content-type":"application/x-www-form-urlencoded"},body:"facilityId=00000000-0000-0000-0000-000000000001&reportType=OTHER&message=fixture-report-message"}));
  expect(response.status).toBe(503);expect(response.headers.get("location")).toBeNull();
 });
});
