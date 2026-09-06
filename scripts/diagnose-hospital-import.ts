import "./env";
import { getSql,closeSql } from "../src/db/connection";
import { MoisHospitalAdapter } from "../src/data/adapters/mois";
import { normalizeImport } from "../src/data/import-normalize";
import type { RegionView } from "../src/lib/regions";

async function main(){
 const sql=getSql(),adapter=new MoisHospitalAdapter(),contract=await adapter.contract();
 try{
  const regionRows=await sql`SELECT r.id,r.parent_id,r.level,r.name,r.short_name,r.full_slug,coalesce(array_agg(a.alias_name) FILTER(WHERE a.alias_name IS NOT NULL),'{}') AS aliases FROM regions r LEFT JOIN region_aliases a ON a.region_id=r.id WHERE r.is_active GROUP BY r.id`;
  const regions:RegionView[]=regionRows.map(r=>({id:r.id,parentId:r.parent_id??undefined,level:r.level,name:r.name,shortName:r.short_name,fullSlug:r.full_slug,aliases:r.aliases}));
  const raws=await sql`SELECT payload_json FROM source_raw_records WHERE source_type='MOIS_ANIMAL_HOSPITAL' ORDER BY created_at,id LIMIT 100`;
  const failures:Record<string,number>={};let valid=0,matched=0,coordinates=0,missingCoordinates=0,invalidCoordinates=0;
  for(const row of raws){try{
   const item=await adapter.normalize(row.payload_json);if(!adapter.validate(item).valid)throw new Error("INVALID_NORMALIZED_RECORD");
   const data=normalizeImport(item,regions,contract.mapping!.sourceDateFormat);if(data.region_status==="MATCHED")matched++;
   if(item.sourceX&&item.sourceY){const x=Number(item.sourceX),y=Number(item.sourceY);const [point]=await sql`SELECT ST_Y(g) AS latitude,ST_X(g) AS longitude FROM (SELECT ST_Transform(ST_SetSRID(ST_MakePoint(${x},${y}),5174),4326) AS g) p`;const lat=Number(point.latitude),lng=Number(point.longitude);if(lat>=32&&lat<=39&&lng>=124&&lng<=132)coordinates++;else invalidCoordinates++;}else missingCoordinates++;
   valid++;
  }catch(error){const code=error instanceof Error&&/^[A-Z0-9_]+$/.test(error.message)?error.message:"UNCLASSIFIED";failures[code]=(failures[code]??0)+1;}}
  console.log(JSON.stringify({raws:raws.length,valid,matched,coordinates,missingCoordinates,invalidCoordinates,failures}));
 }finally{await closeSql();}
}
main().catch(()=>{console.log(JSON.stringify({status:"DIAGNOSTIC_FAILED"}));process.exitCode=1;});
