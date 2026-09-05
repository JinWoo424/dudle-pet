import "./env";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { createHash } from "node:crypto";
import { z } from "zod";
import { getSql,closeSql } from "../src/db/connection";
const money=z.number().int().nonnegative().nullable();
const schema=z.object({
 sourceName:z.string().trim().min(1),sourceUrl:z.url().regex(/^https:\/\//),sourceDate:z.iso.date(),surveyYear:z.number().int().min(2000).max(new Date().getFullYear()),
 rows:z.array(z.object({regionLevel:z.enum(["NATIONAL","PROVINCE","CITY"]),regionSlug:z.string().optional(),categoryCode:z.string().min(1),itemCode:z.enum(["consultation","vaccination","blood-test","xray","ultrasound","ct","mri"]),itemName:z.string().min(1),animalType:z.enum(["DOG","CAT","ALL","NOT_APPLICABLE"]),weightClass:z.enum(["KG_5","KG_10","KG_20","NOT_APPLICABLE"]),minimumPrice:money,medianPrice:money,averagePrice:money,maximumPrice:money,sampleCount:z.number().int().positive().nullable()})).min(1).max(100000)
});
async function main(){
 const file=process.argv[2];if(!file||!process.env.ADMIN_EMAIL)throw new Error("FILE_AND_IMPORTER_REQUIRED");
 const text=await readFile(file,"utf8"),data=schema.parse(JSON.parse(text));
 const hash=createHash("sha256").update(text).digest("hex");
 const dimensions=new Set<string>();
 for(const row of data.rows){
  const key=[row.regionLevel,row.regionSlug,row.itemCode,row.animalType,row.weightClass].join("|");
  if(dimensions.has(key))throw new Error("DUPLICATE_DIMENSION");dimensions.add(key);
  if(row.regionLevel==="NATIONAL"?Boolean(row.regionSlug):!row.regionSlug)throw new Error("REGION_REQUIRED");
  if(row.minimumPrice!==null&&row.maximumPrice!==null&&row.minimumPrice>row.maximumPrice)throw new Error("INVALID_RANGE");
  for(const value of [row.medianPrice,row.averagePrice])if(value!==null&&((row.minimumPrice!==null&&value<row.minimumPrice)||(row.maximumPrice!==null&&value>row.maximumPrice)))throw new Error("INVALID_STATISTICS");
 }
 try{await getSql().begin(async tx=>{
  await tx`SELECT pg_advisory_xact_lock(774203002)`;
  const previous=await tx`SELECT id FROM fee_import_batches WHERE file_hash=${hash} AND status='SUCCESS'`;if(previous.length)throw new Error("ALREADY_IMPORTED");
  const [batch]=await tx`INSERT INTO fee_import_batches(survey_year,source_name,source_url,file_name,file_hash,imported_by,row_count,status) VALUES(${data.surveyYear},${data.sourceName},${data.sourceUrl},${basename(file)},${hash},${process.env.ADMIN_EMAIL!},${data.rows.length},'RUNNING') RETURNING id`;
  for(const row of data.rows){
   const region=row.regionSlug?(await tx`SELECT id,name,level,parent_id FROM regions WHERE full_slug=${row.regionSlug}`)[0]:null;
   if(row.regionSlug&&(!region||region.level!==row.regionLevel))throw new Error("REGION_MISMATCH");
   const parent=region?.parent_id?(await tx`SELECT name FROM regions WHERE id=${region.parent_id}`)[0]:null;
   const normalized={survey_year:data.surveyYear,region_level:row.regionLevel,region_id:region?.id??null,province:row.regionLevel==="PROVINCE"?region?.name??null:parent?.name??null,city:row.regionLevel==="CITY"?region?.name??null:null,category_code:row.categoryCode,item_code:row.itemCode,item_name:row.itemName,animal_type:row.animalType,weight_class:row.weightClass,unit:"원",minimum_price:row.minimumPrice,median_price:row.medianPrice,average_price:row.averagePrice,maximum_price:row.maximumPrice,sample_count:row.sampleCount,source_name:data.sourceName,source_url:data.sourceUrl,source_date:data.sourceDate,import_batch_id:batch.id};
   const existing=await tx`SELECT * FROM medical_fee_statistics WHERE survey_year=${data.surveyYear} AND region_level=${row.regionLevel} AND region_id IS NOT DISTINCT FROM ${region?.id??null}::int AND item_code=${row.itemCode} AND animal_type=${row.animalType} AND weight_class=${row.weightClass} FOR UPDATE`;
   if(existing.length){
    await tx`UPDATE medical_fee_statistics SET ${tx(normalized)},updated_at=now() WHERE id=${existing[0].id}`;
    await tx`INSERT INTO admin_audit_logs(admin,action,entity_type,entity_id,before_json,after_json) VALUES(${process.env.ADMIN_EMAIL!},'FEE_UPDATE','medical_fee_statistics',${existing[0].id},${tx.json(JSON.parse(JSON.stringify(existing[0])))},${tx.json(normalized)})`;
   }else{await tx`INSERT INTO medical_fee_statistics ${tx(normalized)}`;}
  }
  await tx`UPDATE fee_import_batches SET status='SUCCESS',success_count=${data.rows.length} WHERE id=${batch.id}`;
  await tx`INSERT INTO admin_audit_logs(admin,action,entity_type,entity_id,after_json) VALUES(${process.env.ADMIN_EMAIL!},'FEE_IMPORT','fee_import_batches',${batch.id},${tx.json({sourceUrl:data.sourceUrl,rows:data.rows.length})})`;
 });console.log(JSON.stringify({imported:data.rows.length}));}finally{await closeSql();}
}
main().catch(()=>{console.error("Fee import failed. Validate official source, dimensions and values. Transaction rolled back; no fake values substituted.");process.exitCode=1;});
