import { cache } from "react";
import { randomUUID } from "node:crypto";

// Request-scoped correlation only. No query parameters, credentials, or errors.
const requestTrace = cache(() => randomUUID());
export function previewStage(stage: string) {
  if (process.env.VERCEL_ENV !== "preview") return () => undefined;
  const trace = requestTrace(), start = performance.now();
  console.info("[Dudle Preview Server]", JSON.stringify({ trace, stage, event: "start" }));
  return () => console.info("[Dudle Preview Server]", JSON.stringify({ trace, stage, event: "end", ms: Math.round(performance.now() - start) }));
}
