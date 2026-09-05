import { describe,it,expect } from "vitest";
import { dataMode } from "../data-mode";
import { parseFacilityRoute } from "../regions";
import { safeJson,statusLabels } from "../facility-display";
describe("production safety",()=>{
 it("defaults to database even when connection is absent",()=>{expect(dataMode({NODE_ENV:"production"})).toBe("database");expect(dataMode({NODE_ENV:"development"})).toBe("database");});
 it("rejects production mock including legacy switch",()=>{expect(()=>dataMode({NODE_ENV:"production",DATA_MODE:"mock"})).toThrow();expect(()=>dataMode({NODE_ENV:"production",USE_MOCK_DATA:"true"})).toThrow();});
 it("permits only explicit development mock",()=>{expect(dataMode({NODE_ENV:"development",DATA_MODE:"mock"})).toBe("mock");});
 it("validates route structure",()=>{expect(parseFacilityRoute(["jeonnam","yeosu","24h"])).toMatchObject({fullSlug:"jeonnam/yeosu",feature:"24h"});expect(parseFacilityRoute(["../bad"])).toBeNull();});
 it("JSON-LD cannot terminate its script",()=>{expect(safeJson({name:"</script><script>alert(1)</script>"})).not.toContain("<");});
 it("does not label closed as open",()=>{expect(statusLabels.CLOSED).not.toContain("영업");});
});
