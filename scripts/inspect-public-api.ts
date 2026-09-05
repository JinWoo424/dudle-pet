import "./env";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { publicAdapters } from "../src/data/adapters/mois";
import { redactSample, sourceFiles } from "../src/data/adapters/contract";
async function main(){
 if(!process.env.PUBLIC_DATA_SERVICE_KEY)throw new Error("KEY_NOT_CONFIGURED");
 await mkdir("docs/api-samples",{recursive:true});
 let failures=0;
 for(const adapter of publicAdapters){
  try{
   const raw=redactSample(await adapter.fetchRaw({page:1,pageSize:5}),process.env.PUBLIC_DATA_SERVICE_KEY!);
   const text=JSON.stringify(raw,null,2)+"\n";
   await writeFile(`docs/api-samples/${sourceFiles[adapter.sourceType]}.json`,text,"utf8");
   const page=await adapter.parse(raw);
   if(page.items.length>5||(!page.items.length&&page.totalCount!==0))throw new Error("INVALID_SAMPLE_SIZE");
   const keys=page.items[0]&&typeof page.items[0]==="object"?Object.keys(page.items[0]):[];
   console.log(JSON.stringify({source:adapter.sourceType,count:page.items.length,total:page.totalCount,keys,sampleSha256:createHash("sha256").update(text).digest("hex")}));
  }catch{failures++;console.error(`${adapter.sourceType}: inspection failed or contract unconfirmed. No credentials are printed.`);}
 }
 if(failures)process.exitCode=1;
}
main().catch(()=>{console.error("Inspection blocked: configure service key and verified API request contracts. No calls were confirmed.");process.exitCode=1;});
