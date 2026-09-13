import { cache } from "react";
import { randomUUID } from "node:crypto";

import { after } from "next/server";

export const SLOW_STAGE_MS = 1000;
export const SEVERE_STAGE_MS = 5000;
export const PROGRESS_MS = [5000, 15000, 30000, 60000, 120000] as const;
// Fixed scope: arbitrary paths, query strings and headers are never logged.
const routes = new Set(["hospital", "pharmacy"].flatMap(type =>
  ["seoul", "busan", "jeonnam-gwangju/yeosu"].map(region => `/${type}/${region}`)));
type Status = "pending" | "success" | "failure";
export function safeDiagnosticError(error: unknown) {
  const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
  const allowed = ["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "CONNECTION_CLOSED", "CONNECT_TIMEOUT", "EMAXCONNSESSION", "53300", "57014", "40P01", "SELF_SIGNED_CERT_IN_CHAIN"];
  const errorType = typeof code === "string" && allowed.includes(code) ? code :
    error instanceof TypeError ? "TypeError" : error instanceof Error ? "Error" : "UnknownError";
  return { errorType, safeMessage: "Operation did not complete successfully; raw error omitted" };
}

// Observational only: no driver patches, new DB operations or cancellation.
export function createDiagnostic(route: string, registerAfter: (callback: () => void) => void) {
  const requestId = randomUUID(), start = performance.now();
  const active = new Map<string, number>(), durations: Record<string, number> = {};
  let finished = false, failed = false, renderReady = false;
  const elapsed = () => Math.round(performance.now() - start);
  const emit = (stage: string, status: Status, extra: Record<string, string | number | string[] | null> = {}) => {
    console.info("[Dudle Diagnostic]", JSON.stringify({requestId, timestamp: new Date().toISOString(), elapsedMs: elapsed(), route, pageType: route.split("/")[1], region: route.split("/").slice(2).join("/"), stage, status, ...extra}));
  };
  emit("request_start", "pending", {boundary: "directory_entry_not_network_arrival"});
  const timers = PROGRESS_MS.map(ms => {
    const timer = setTimeout(() => {
      if (!finished) emit("request_still_running", "pending", {activeStages: [...active.keys()], warning: "severe", thresholdMs: ms});
    }, ms);
    timer.unref();
    return timer;
  });
  const finish = () => {
    if (finished) return;
    finished = true;
    timers.forEach(clearTimeout);
    emit("request_end", failed ? "failure" : renderReady && active.size === 0 ? "success" : "pending", {
      boundary: "next_after_callback_not_http_status", totalMs: elapsed(),
      countMs: durations["facilities.count"] ?? null, rowsMs: durations["facilities.rows"] ?? null,
      relatedMs: durations["directory.related"] ?? null, metadataMs: durations["metadata"] ?? null,
      activeStages: [...active.keys()], httpStatus: "unavailable_use_vercel_request_log",
    });
  };
  registerAfter(finish);
  return {
    stage(stage: string) {
      const begun = performance.now(); let ended = false;
      active.set(stage, begun); emit(`${stage}_start`, "pending");
      return (error?: unknown) => {
        if (ended || finished) return;
        ended = true; active.delete(stage);
        const ms = Math.round(performance.now() - begun); durations[stage] = ms;
        if (error !== undefined) {failed = true; emit("stage_error", "failure", {operation: stage, stageMs: ms, ...safeDiagnosticError(error)});}
        else emit(`${stage}_end`, "success", {stageMs: ms});
        if (ms >= SLOW_STAGE_MS) emit("slow_stage", error === undefined ? "success" : "failure", {operation: stage, stageMs: ms, warning: ms >= SEVERE_STAGE_MS ? "severe" : "slow"});
      };
    },
    markRenderReady() { renderReady = true; emit("render_ready", "success", {boundary: "component_return_not_stream_completion"}); },
    client(reused: boolean, clientId: string) { emit("db_client", "success", {lifecycle: reused ? "reused" : "created", clientId, boundary: "lazy_client_not_connection_acquired"}); },
    finish,
  };
}
const requestState = cache(() => ({diagnostic: undefined as ReturnType<typeof createDiagnostic> | undefined}));
export function beginDirectoryDiagnostic(route: string) {
  if (process.env.VERCEL_ENV !== "preview" || !routes.has(route)) return;
  const state = requestState();
  state.diagnostic ??= createDiagnostic(route, after);
}
export function previewStage(stage: string): (error?: unknown) => void {
  if (process.env.VERCEL_ENV !== "preview") return () => undefined;
  return requestState().diagnostic?.stage(stage) ?? (() => undefined);
}
export async function measuredStage<T>(stage: string, operation: () => PromiseLike<T>): Promise<T> {
  const end = previewStage(stage);
  try { const result = await operation(); end(); return result; }
  catch (error) { end(error); throw error; }
}
export function diagnosticRenderReady() { if(process.env.VERCEL_ENV === "preview") requestState().diagnostic?.markRenderReady(); }
export function diagnosticClient(reused: boolean, clientId: string) { if(process.env.VERCEL_ENV === "preview") requestState().diagnostic?.client(reused, clientId); }
