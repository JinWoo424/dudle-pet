import "./env";
import { closeSql, getSql } from "@/db/connection";

async function main(){
 const sql=getSql();
 const result=await sql.begin(async tx=>{
  const rows=await tx<Array<{id:string}>>`
   UPDATE facilities f SET last_synced_at=p.last_seen_at,updated_at=now()
   FROM facility_source_presence p
   WHERE p.facility_id=f.id AND p.source_type='MOIS_ANIMAL_HOSPITAL'
     AND f.public_source='MOIS_ANIMAL_HOSPITAL' AND f.last_synced_at IS NULL
     AND p.last_seen_at IS NOT NULL
   RETURNING f.id`;
  await tx`INSERT INTO admin_audit_logs(admin,action,entity_type,entity_id,after_json)
   VALUES('codex-local-review','REPAIR_SYNC_TIMESTAMP','facilities','MOIS_ANIMAL_HOSPITAL',${tx.json({repaired_count:rows.length,source:"facility_source_presence.last_seen_at"})})`;
  return {repaired_count:rows.length};
 });
 console.log(JSON.stringify(result));
}
main().finally(closeSql);
