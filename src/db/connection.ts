import postgres from "postgres";
let connection: ReturnType<typeof postgres> | undefined;
export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Database is not configured");
  connection ??= postgres(url, { max: 3, prepare: false, connect_timeout: 10, idle_timeout: 20, onnotice: () => undefined });
  return connection;
}
export async function closeSql() { await connection?.end(); connection = undefined; }
