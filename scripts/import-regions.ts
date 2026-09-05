import "./env";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import { getSql,closeSql } from "../src/db/connection";
const slug=z.string().regex(/^[a-z0-9-]+(?:\/[a-z0-9-]+){0,2}$/);
const schema=z.object({sourceName:z.string().min(1),sourceUrl:z.url(),regions:z.array(z.object({name:z.string().min(1),shortName:z.string().min(1),level:z.enum(["PROVINCE","CITY","DISTRICT"]),fullSlug:slug,parentSlug:slug.optional()})).min(1)});
async function main(){
 if(!process.argv[2]||!process.env.ADMIN_EMAIL)throw new Error("INPUT_AND_IMPORTER_REQUIRED");
 const data=schema.parse(JSON.parse(await readFile(process.argv[2],"utf8")));
 const paths=new Set(data.regions.map(r=>r.fullSlug));if(paths.size!==data.regions.length)throw new Error("DUPLICATE_REGION");
 const rows=data.regions.sort((a,b)=>a.fullSlug.split("/").length-b.fullSlug.split("/").length);
 for(const r of rows){
  const level=r.fullSlug.split("/").length;
  if(level!=={PROVINCE:1,CITY:2,DISTRICT:3}[r.level])throw new Error("INVALID_HIERARCHY");
  if(r.level==="PROVINCE"?Boolean(r.parentSlug):!r.parentSlug||r.parentSlug!==r.fullSlug.split("/").slice(0,-1).join("/")||!paths.has(r.parentSlug))throw new Error("MISSING_PARENT");
 }
 try{await getSql().begin(async tx=>{
  for(const r of rows){
   const parent=r.parentSlug?(await tx`SELECT id FROM regions WHERE full_slug=${r.parentSlug}`)[0]?.id:null;
   await tx`INSERT INTO regions(parent_id,level,name,short_name,slug,full_slug) VALUES(${parent},${r.level},${r.name},${r.shortName},${r.fullSlug.split("/").at(-1)!},${r.fullSlug})
    ON CONFLICT(full_slug) DO UPDATE SET parent_id=EXCLUDED.parent_id,level=EXCLUDED.level,name=EXCLUDED.name,short_name=EXCLUDED.short_name,updated_at=now()`;
  }
  await tx`INSERT INTO admin_audit_logs(admin,action,entity_type,entity_id,after_json) VALUES(${process.env.ADMIN_EMAIL!},'REGION_IMPORT','regions',${data.sourceName},${tx.json({sourceUrl:data.sourceUrl,count:rows.length})})`;
 });console.log(JSON.stringify({imported:rows.length}));}finally{await closeSql();}
}
main().catch(()=>{console.error("Region import failed. Validate the normalized official region registry and database connection.");process.exitCode=1;});
