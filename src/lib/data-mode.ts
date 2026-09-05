export function dataMode(env: NodeJS.ProcessEnv = process.env): "mock" | "database" {
  const production = env.NODE_ENV === "production" || env.VERCEL_ENV === "production";
  const mode = env.DATA_MODE ?? "database";
  if (mode !== "mock" && mode !== "database") throw new Error("DATA_MODE must be mock or database");
  if (production && (mode === "mock" || env.USE_MOCK_DATA === "true")) throw new Error("Mock data is prohibited in production");
  return mode;
}
