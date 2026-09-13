import {afterEach,describe,expect,it,vi} from "vitest";
import {previewStage} from "./preview-server-timing";
afterEach(()=>{vi.unstubAllEnvs();vi.restoreAllMocks();});
describe("Preview-only server diagnostics",()=>{
 it("does not log in Production",()=>{
  vi.stubEnv("VERCEL_ENV","production");const log=vi.spyOn(console,"info").mockImplementation(()=>{});
  previewStage("facilities.count")();expect(log).not.toHaveBeenCalled();
 });
 it("logs correlated start/end without environment or SQL values",()=>{
  vi.stubEnv("VERCEL_ENV","preview");const log=vi.spyOn(console,"info").mockImplementation(()=>{});
  previewStage("facilities.count")();
  const start=JSON.parse(log.mock.calls[0][1]),end=JSON.parse(log.mock.calls[1][1]);
  expect(start.event).toBe("start");expect(end.event).toBe("end");expect(end.trace).toBe(start.trace);
  expect(Object.keys(end).sort()).toEqual(["event","ms","stage","trace"]);expect(end.ms).toBeGreaterThanOrEqual(0);
 });
});
