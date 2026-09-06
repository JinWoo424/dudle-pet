import "./env";
import { readFile } from "node:fs/promises";
async function main(){
 const path=process.env.SUPABASE_CA_CERT_PATH;if(!path)throw new Error("LOCAL_CA_PATH_REQUIRED_FOR_TEST");
 process.env.SUPABASE_CA_CERT=await readFile(path,"utf8");delete process.env.SUPABASE_CA_CERT_PATH;
 const {getSql,closeSql}=await import("@/db/connection");try{const [row]=await getSql()`SELECT current_setting('ssl') AS ssl`;console.log(JSON.stringify({inlineCaRecognized:true,ssl:row.ssl}));}finally{await closeSql();}
}
main().catch(()=>{console.error("Inline CA verification failed without disabling TLS verification.");process.exitCode=1;});
