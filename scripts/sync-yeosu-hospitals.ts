import "./env";
import { MoisHospitalAdapter } from "../src/data/adapters/mois";
import { syncSource } from "../src/data/sync";
import { closeSql } from "../src/db/connection";

async function main(){
 const adapter=new MoisHospitalAdapter();
 const guard=(raw:unknown)=>raw!==null&&typeof raw==="object"&&String((raw as Record<string,unknown>).ROAD_NM_ADDR??(raw as Record<string,unknown>).LOTNO_ADDR??"").includes("여수시");
 try{console.log(JSON.stringify(await syncSource(adapter,"targeted",Date.now()+5*60*1000,{filters:{"cond[ROAD_NM_ADDR::LIKE]":"여수시"},rawGuard:guard})));}
 finally{await closeSql();}
}
main().catch(()=>{console.error("Yeosu hospital import failed. Existing facilities are preserved.");process.exitCode=1;});
