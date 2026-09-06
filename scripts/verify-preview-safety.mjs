import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { inspectPreview } from "./lib/preview-qa.mjs";

const port = await new Promise((resolvePort, reject) => {
  const server = createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    const selected = typeof address === "object" && address ? address.port : 0;
    server.close((error) => error ? reject(error) : resolvePort(selected));
  });
});
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, [resolve("node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(port)], {
  cwd: process.cwd(), env: { ...process.env, VERCEL: "1", VERCEL_ENV: "preview" }, stdio: "ignore",
});

try {
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (child.exitCode !== null) break;
    try { const response = await fetch(`${base}/robots.txt`); if (response.ok) { ready = true; break; } } catch {}
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }
  if (!ready) throw new Error("Preview server did not become ready.");
  const report = await inspectPreview(base);
  console.log(JSON.stringify({ checks: report.results, failures: report.failures, kakaoBrowserCheckRequired: report.kakaoBrowserCheckRequired }, null, 2));
  if (report.failures.length) process.exitCode = 1;
} catch {
  console.error("PREVIEW_SAFETY_CHECK: FAILED");
  process.exitCode = 1;
} finally {
  child.kill();
}
