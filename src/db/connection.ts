import postgres from "postgres";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { diagnosticClient, previewStage } from "@/lib/preview-server-timing";
let connection: ReturnType<typeof postgres> | undefined;
let clientId = "";
export function getSql() {
  const end = previewStage("db_prepare");
  try {
  const reused = Boolean(connection);
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Database is not configured");
  if (!connection) {
    const caPath = process.env.SUPABASE_CA_CERT_PATH;
    const inlineCa=process.env.SUPABASE_CA_CERT?.replace(/\\n/g,"\n").trim();
    const ca = inlineCa || (caPath ? readFileSync(caPath, "utf8") : undefined);
    connection = postgres(url, { max: 4, prepare: false, connect_timeout: 10, idle_timeout: 20,
      ssl: { rejectUnauthorized: true, servername: new URL(url).hostname, ...(ca ? { ca } : {}) },
      onnotice: () => undefined });
    clientId = randomUUID();
  }
  diagnosticClient(reused, clientId);
  end();
  return connection;
  } catch(error) { end(error); throw error; }
}
export async function closeSql() { await connection?.end(); connection = undefined; }
