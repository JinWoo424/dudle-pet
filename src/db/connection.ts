import postgres from "postgres";
import { readFileSync } from "node:fs";
let connection: ReturnType<typeof postgres> | undefined;
export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Database is not configured");
  if (!connection) {
    const caPath = process.env.SUPABASE_CA_CERT_PATH;
    const inlineCa=process.env.SUPABASE_CA_CERT?.replace(/\\n/g,"\n").trim();
    const ca = inlineCa || (caPath ? readFileSync(caPath, "utf8") : undefined);
    connection = postgres(url, { max: 4, prepare: false, connect_timeout: 10, idle_timeout: 20,
      ssl: { rejectUnauthorized: true, servername: new URL(url).hostname, ...(ca ? { ca } : {}) },
      onnotice: () => undefined });
  }
  return connection;
}
export async function closeSql() { await connection?.end(); connection = undefined; }
