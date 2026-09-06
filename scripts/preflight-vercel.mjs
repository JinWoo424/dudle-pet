import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";

const packageManagerScript = process.env.npm_execpath;
const previewEnvFile = ".local-secrets/vercel-preview.env";
const previewEnvironment = existsSync(previewEnvFile) ? parseEnv(readFileSync(previewEnvFile, "utf8")) : {};
const steps = [
  ["lint", {}],
  ["typecheck", {}],
  ["test", {}],
  ["build", { VERCEL: "1", VERCEL_ENV: "preview" }],
  ["scan:secrets", {}],
  ["verify:preview-safety", {}],
  ["verify:vercel-env", {}],
];

for (const [script, extraEnv] of steps) {
  console.log(`PREFLIGHT_STEP: ${script}`);
  const command = packageManagerScript ? process.execPath : (process.platform === "win32" ? "npm.cmd" : "npm");
  const args = packageManagerScript ? [packageManagerScript, "run", script] : ["run", script];
  const result = spawnSync(command, args, { cwd: process.cwd(), env: { ...process.env, ...previewEnvironment, ...extraEnv }, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log("VERCEL_PREFLIGHT: PASSED");
