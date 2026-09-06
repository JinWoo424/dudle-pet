import { spawnSync } from "node:child_process";

const packageManagerScript = process.env.npm_execpath;
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
  const result = spawnSync(command, args, { cwd: process.cwd(), env: { ...process.env, ...extraEnv }, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log("VERCEL_PREFLIGHT: PASSED");
