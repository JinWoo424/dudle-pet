import { existsSync } from "node:fs";
// Node's native dotenv loader preserves shell values and never prints secrets.
for (const file of [".env.local", ".env"]) {
 if (existsSync(file)) process.loadEnvFile(file);
}
