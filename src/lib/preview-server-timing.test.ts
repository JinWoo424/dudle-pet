import {afterEach,describe,expect,it,vi} from "vitest";
import {previewStage,createDiagnostic,safeDiagnosticError,beginDirectoryDiagnostic} from "./preview-server-timing";
afterEach(()=>{vi.useRealTimers();vi.unstubAllEnvs();vi.restoreAllMocks();});
describe("Preview-only server diagnostics",()=>{
 it("does not log in Production",()=>{
  vi.stubEnv("VERCEL_ENV","production");const log=vi.spyOn(console,"info").mockImplementation(()=>{});
  previewStage("facilities.count")();expect(log).not.toHaveBeenCalled();
 });
 it("logs correlated start/end without environment or SQL values",()=>{
  vi.stubEnv("VERCEL_ENV","preview");const log=vi.spyOn(console,"info").mockImplementation(()=>{});
  const d=createDiagnostic("/hospital/seoul",()=>{});
  d.stage("facilities.count")();
  d.markRenderReady();d.finish();
  const start=JSON.parse(log.mock.calls[0][1]),end=JSON.parse(log.mock.calls[1][1]);
  expect(start.stage).toBe("request_start");expect(end.stage).toBe("facilities.count_start");expect(end.requestId).toBe(start.requestId);
  expect(end.timestamp).toBeTruthy();expect(end.elapsedMs).toBeGreaterThanOrEqual(0);
 });
 it("observes hung stages without cancellation and clears all timers",()=>{
  vi.useFakeTimers();const log=vi.spyOn(console,"info").mockImplementation(()=>{});
  let finish=()=>{};const d=createDiagnostic("/pharmacy/busan",callback=>{finish=callback;});
  const end=d.stage("facilities.rows");
  vi.advanceTimersByTime(15000);
  const progress=log.mock.calls.map(c=>JSON.parse(c[1])).filter(e=>e.stage==="request_still_running");
  expect(progress).toHaveLength(2);expect(progress[1].activeStages).toContain("facilities.rows");
  end();d.markRenderReady();finish();finish();
  expect(vi.getTimerCount()).toBe(0);
  expect(log.mock.calls.map(c=>JSON.parse(c[1])).filter(e=>e.stage==="request_end")).toHaveLength(1);
 });
 it("logs a safe error and does not serialize arbitrary message/code",()=>{
  const log=vi.spyOn(console,"info").mockImplementation(()=>{});
  const d=createDiagnostic("/hospital/seoul",()=>{});
  d.stage("facilities.count")(Object.assign(new Error("private sentinel"),{code:"private code"}));d.finish();
  expect(JSON.stringify(log.mock.calls)).not.toContain("private sentinel");
  expect(JSON.stringify(log.mock.calls)).not.toContain("private code");
  expect(safeDiagnosticError({code:"ECONNRESET"}).errorType).toBe("ECONNRESET");
  expect(JSON.parse(log.mock.calls.at(-1)![1]).status).toBe("failure");
 });
 it("does not activate outside the six Preview routes",()=>{
  vi.stubEnv("VERCEL_ENV","preview");const log=vi.spyOn(console,"info").mockImplementation(()=>{});
  beginDirectoryDiagnostic("/hospital/untrusted-value");previewStage("facilities.rows")();
  expect(log).not.toHaveBeenCalled();
 });
});
