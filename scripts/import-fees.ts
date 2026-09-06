import "./env";
import { readFile } from "node:fs/promises";
import { closeSql } from "../src/db/connection";
import { importFeeFile, previewFeeImport, rollbackFeeImport } from "../src/data/fee-import";

async function main(){
 const args=process.argv.slice(2);const rollbackIndex=args.indexOf("--rollback");
 if(rollbackIndex>=0){
  const batchId=args[rollbackIndex+1];if(!batchId||!process.env.ADMIN_EMAIL)throw new Error("ROLLBACK_BATCH_AND_ADMIN_REQUIRED");
  console.log(JSON.stringify(await rollbackFeeImport(batchId,process.env.ADMIN_EMAIL)));
  return;
 }
 const file=args.find(value=>!value.startsWith("--"));if(!file)throw new Error("FILE_REQUIRED");
 const source=await readFile(file,"utf8");const preview=await previewFeeImport(source);
 const safePreview={...preview,sourceUrl:new URL(preview.sourceUrl).origin,rows:undefined,fileHash:`${preview.fileHash.slice(0,12)}…`};
 console.log(JSON.stringify(safePreview,null,2));
 if(args.includes("--preview"))return;
 if(!args.includes("--commit")||!process.env.ADMIN_EMAIL)throw new Error("PREVIEW_THEN_EXPLICIT_COMMIT_REQUIRED");
 console.log(JSON.stringify(await importFeeFile(source,file,process.env.ADMIN_EMAIL)));
}
main().catch(()=>{console.error("Fee import failed. Preview the official file and resolve every validation error; no values were substituted.");process.exitCode=1;}).finally(closeSql);
