import "./env";
import { getSql,closeSql } from "../src/db/connection";
async function main(){
 const id=process.argv[2];
 if(!id||!/^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/.test(id)||!process.argv.includes("--reviewed")||!process.env.ADMIN_EMAIL)throw new Error("MANUAL_REVIEW_REQUIRED");
 try{
  await getSql().begin(async tx=>{
   const [row]=await tx`SELECT s.* FROM sync_source_snapshots s JOIN sync_runs r ON r.id=s.sync_run_id WHERE s.id=${id} AND s.record_count=100 AND NOT s.complete AND r.status='SUCCESS' FOR UPDATE OF s`;
   if(!row)throw new Error("SUCCESSFUL_SAMPLE100_REQUIRED");
   await tx`UPDATE sync_source_snapshots SET approved_at=now(),approved_by=${process.env.ADMIN_EMAIL!} WHERE id=${id}`;
   await tx`INSERT INTO admin_audit_logs(admin,action,entity_type,entity_id,after_json) VALUES(${process.env.ADMIN_EMAIL!},'APPROVE_SAMPLE100','sync_source_snapshots',${id},${tx.json({reviewed:true})})`;
  });console.log("Sample100 approval recorded. Full sync is now allowed for this source.");
 }finally{await closeSql();}
}
main().catch(()=>{console.error("Approval not recorded. Review the successful 100-record import before using --reviewed.");process.exitCode=1;});
