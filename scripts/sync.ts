import "./env";
import { publicAdapters } from "../src/data/adapters/mois";
import { sourceFiles } from "../src/data/adapters/contract";
import { syncSource } from "../src/data/sync";
import { closeSql } from "../src/db/connection";
async function main(){
 const requested=process.argv[2]??"all";const stage=process.argv.includes("--full")?"full":"sample100";
 const targets=publicAdapters.filter(a=>requested==="all"||sourceFiles[a.sourceType]===requested);
 if(!targets.length)throw new Error("INVALID_SOURCE");
 let failed=false;
 try{for(const adapter of targets){try{console.log(JSON.stringify(await syncSource(adapter,stage)));}catch{failed=true;console.error(`${adapter.sourceType}: sync blocked or failed; inspect configuration and sync_runs. Existing facilities are preserved on failed transactions.`);}}}
 finally{await closeSql();}
 if(failed)process.exitCode=1;
}
main().catch(()=>{console.error("Sync could not run. No successful import is claimed.");process.exitCode=1;});
