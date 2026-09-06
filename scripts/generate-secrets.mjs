import { randomBytes } from "node:crypto";

const secrets = {
  ADMIN_SESSION_SECRET: randomBytes(32).toString("base64url"),
  CRON_SECRET: randomBytes(32).toString("base64url"),
};

if (process.argv.includes("--check")) {
  process.stdout.write(JSON.stringify({ generated: Object.keys(secrets), minimumLengthSatisfied: Object.values(secrets).every((value) => value.length >= 32) }) + "\n");
} else {
  process.stdout.write(Object.entries(secrets).map(([name, value]) => `${name}=${value}`).join("\n") + "\n");
}
