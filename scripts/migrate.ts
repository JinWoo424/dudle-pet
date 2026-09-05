import "./env";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import postgres from "postgres";
async function main() {
 const url=process.env.DIRECT_URL||process.env.DATABASE_URL;
 if(!url) throw new Error("DATABASE_NOT_CONFIGURED");
 const sql=postgres(url,{max:1,prepare:false,connect_timeout:10,onnotice:()=>{}});
 try {
  await sql.begin(async tx=>{
   await tx`SELECT pg_advisory_xact_lock(774203001)`;
   await tx`CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`;
   const applied=await tx`SELECT name,checksum FROM schema_migrations`;
   for(const file of (await readdir("drizzle")).filter(f=>/^\d+.*\.sql$/.test(f)).sort()) {
    const source=await readFile(`drizzle/${file}`,"utf8");
    const hash=createHash("sha256").update(source).digest("hex");
    const previous=applied.find(r=>r.name===file);
    if(previous){if(previous.checksum!==hash)throw new Error("MIGRATION_CHECKSUM_CHANGED");continue;}
    await tx.unsafe(source);
    await tx`INSERT INTO schema_migrations(name,checksum) VALUES(${file},${hash})`;
   }
  });
  console.log("Migration transaction committed.");
 }finally{await sql.end();}
}
main().catch(()=>{console.error("Migration failed. Check DB configuration, permissions and migration checksums. No credentials are printed.");process.exitCode=1;});
