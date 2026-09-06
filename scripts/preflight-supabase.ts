import "./env";
import postgres from "postgres";
import { readFileSync } from "node:fs";

const names=["DATABASE_URL","DIRECT_URL","PUBLIC_DATA_SERVICE_KEY","NEXT_PUBLIC_KAKAO_MAP_JS_KEY","ADSENSE_ENABLED"] as const;
async function main(){
console.log(JSON.stringify({environment:[...names.map(name=>({name,status:process.env[name]?"설정됨":"누락됨"})),{name:"SUPABASE_CA",status:process.env.SUPABASE_CA_CERT||process.env.SUPABASE_CA_CERT_PATH?"설정됨":"누락됨"}]}));
for(const name of ["DATABASE_URL","DIRECT_URL"] as const){
 const value=process.env[name];
 if(!value){console.log(JSON.stringify({connection:name,status:"MISSING"}));continue;}
 let sql:ReturnType<typeof postgres>|undefined;
 try{
  const url=new URL(value);
  if(url.protocol!=="postgresql:"||!url.hostname.endsWith(".supabase.co")&&!url.hostname.endsWith(".supabase.com")||url.pathname!=="/postgres")throw new Error("INVALID_TARGET");
  // Only trust a CA downloaded from the project's Supabase dashboard.
  // Missing/unreadable certificates fail closed; never log file contents.
  const caPath=process.env.SUPABASE_CA_CERT_PATH;
  const inlineCa=process.env.SUPABASE_CA_CERT?.replace(/\\n/g,"\n").trim();
  const ca=inlineCa||(caPath?readFileSync(caPath,"utf8"):undefined);
  sql=postgres(value,{max:1,prepare:false,connect_timeout:10,idle_timeout:5,ssl:{rejectUnauthorized:true,servername:url.hostname,...(ca?{ca}:{})},onnotice:()=>{}});
  const evidence=await sql.begin(async tx=>{
   await tx`SET TRANSACTION READ ONLY`;
   await tx`SET LOCAL statement_timeout='10s'`;
   const [permissions]=await tx`SELECT has_schema_privilege(current_user,'public','CREATE') AS can_create_public,current_setting('transaction_read_only') AS read_only`;
   const extensions=await tx`SELECT e.extname,e.extversion,n.nspname AS schema FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace WHERE e.extname='postgis'`;
   const tables=await tx`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`;
   const indexes=await tx`SELECT indexname,tablename FROM pg_indexes WHERE schemaname='public' ORDER BY tablename,indexname`;
   return {permissions,postgis:extensions,tables,indexes};
  });
  console.log(JSON.stringify({connection:name,status:"CONNECTED_READ_ONLY",...evidence}));
 }catch(error){
  const code=(error as {code?:unknown}).code;
  console.log(JSON.stringify({connection:name,status:"FAILED",code:typeof code==="string"&&/^[A-Z0-9_]{2,50}$/.test(code)?code:"CONNECTION_FAILED"}));
  process.exitCode=1;
  break; // Stop at the first failed connection; do not advance the workflow.
 }finally{await sql?.end({timeout:2});}
}
}
main().catch(()=>{console.log(JSON.stringify({status:"PREFLIGHT_FAILED"}));process.exitCode=1;});
