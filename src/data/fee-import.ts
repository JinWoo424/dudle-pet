import { createHash } from "node:crypto";
import { basename } from "node:path";
import { z } from "zod";
import { getSql } from "@/db/connection";
import { isOfficialFeeDimension, officialFeeItemByCode, officialFeeItems, type FeeAnimalType, type FeeWeightClass } from "@/data/fee-catalog";

const sourceSchema=z.object({
 sourceName:z.string().trim().min(1),sourceUrl:z.url().refine(value=>{
  const host=new URL(value).hostname.toLowerCase();
  return host==="animalclinicfee.or.kr"||host==="www.animalclinicfee.or.kr"||host==="mafra.go.kr"||host.endsWith(".mafra.go.kr");
 },"OFFICIAL_SOURCE_REQUIRED"),sourceDate:z.iso.date(),surveyYear:z.number().int().min(2023).max(2100),
 rows:z.array(z.object({
  regionLevel:z.enum(["NATIONAL","PROVINCE","CITY"]),surveyRegionCode:z.string().trim().min(1).max(40).nullable().optional(),
  surveyProvinceName:z.string().trim().min(1).max(80).nullable().optional(),surveyCityName:z.string().trim().min(1).max(80).nullable().optional(),
  currentRegionSlug:z.string().regex(/^[a-z0-9-]+(?:\/[a-z0-9-]+){0,2}$/).nullable().optional(),categoryCode:z.string().trim().min(1),
  itemCode:z.string().trim().min(1),itemName:z.string().trim().min(1),animalType:z.enum(["DOG","CAT","ALL","NOT_APPLICABLE"]),
  weightClass:z.enum(["KG_5","KG_10","KG_20","NOT_APPLICABLE"]),minimumPrice:z.unknown(),medianPrice:z.unknown(),averagePrice:z.unknown(),maximumPrice:z.unknown(),sampleCount:z.unknown().optional(),
 })).min(1).max(100000),
});

type Input=z.infer<typeof sourceSchema>;
type InputRow=Input["rows"][number];
type RegionRow={id:number;full_slug:string;level:string;name:string;parent_name:string|null};
export type FeeRegionMatchStatus="MATCHED"|"HISTORICAL_ONLY"|"NOT_APPLICABLE";
export interface NormalizedFeeRow extends Omit<InputRow,"minimumPrice"|"medianPrice"|"averagePrice"|"maximumPrice"|"sampleCount"> {
 minimumPrice:number|null;medianPrice:number|null;averagePrice:number|null;maximumPrice:number|null;sampleCount:number|null;
 currentRegionId:number|null;regionMatchStatus:FeeRegionMatchStatus;
}
export interface FeeImportPreview {
 fileHash:string;surveyYear:number;sourceName:string;sourceUrl:string;sourceDate:string;totalRows:number;validRows:number;regionMatched:number;
 historicalRegionMatched:number;historicalOnly:number;priceParsingErrors:number;rangeErrors:number;medianErrors:number;averageErrors:number;
 duplicateKeys:number;missingItems:string[];unknownItems:number;invalidDimensions:number;regionErrors:number;alreadyImported:boolean;canImport:boolean;
 errors:{row:number;codes:string[]}[];rows:NormalizedFeeRow[];
}

function money(value:unknown):number|null|undefined{
 if(value==null||(typeof value==="string"&&["","-","없음"].includes(value.trim())))return null;
 if(typeof value!=="string"&&typeof value!=="number")return undefined;
 const normalized=typeof value==="string"?value.replace(/[\s,원]/g,""):value;
 if(typeof normalized==="string"&&!/^\d+$/.test(normalized))return undefined;
 const parsed=typeof normalized==="number"?normalized:Number(normalized);
 return Number.isSafeInteger(parsed)&&parsed>=0?parsed:undefined;
}
function count(value:unknown):number|null|undefined{
 if(value==null||value==="")return null;
 const normalized=typeof value==="string"?value.replace(/[\s,개소]/g,""):value;
 const parsed=typeof normalized==="number"?normalized:Number(normalized);
 return Number.isSafeInteger(parsed)&&parsed>0?parsed:undefined;
}
function dimensionKey(row:InputRow){return [row.regionLevel,row.surveyRegionCode??"",row.surveyProvinceName??"",row.surveyCityName??"",row.itemCode,row.animalType,row.weightClass].join("|");}

export async function previewFeeImport(text:string):Promise<FeeImportPreview>{
 const fileHash=createHash("sha256").update(text).digest("hex");
 const parsed=sourceSchema.parse(JSON.parse(text)) as Input;
 const sql=getSql();
 const regionRows=await sql<RegionRow[]>`SELECT r.id,r.full_slug,r.level,r.name,p.name AS parent_name FROM regions r LEFT JOIN regions p ON p.id=r.parent_id WHERE r.is_active`;
 const regions=new Map(regionRows.map(row=>[row.full_slug,row]));
 const [existing]=await sql`SELECT EXISTS(SELECT 1 FROM fee_import_batches WHERE file_hash=${fileHash} AND status='SUCCESS') AS exists`;
 const seen=new Set<string>(),presentItems=new Set<string>();let duplicateKeys=0,priceParsingErrors=0,rangeErrors=0,medianErrors=0,averageErrors=0,unknownItems=0,invalidDimensions=0,regionErrors=0,regionMatched=0,historicalRegionMatched=0,historicalOnly=0;
 const errors:{row:number;codes:string[]}[]=[];const rows:NormalizedFeeRow[]=[];
 for(const [index,row] of parsed.rows.entries()){
  const codes:string[]=[];const key=dimensionKey(row);if(seen.has(key)){duplicateKeys++;codes.push("DUPLICATE_KEY");}seen.add(key);
  const item=officialFeeItemByCode.get(row.itemCode);if(!item||item.itemName!==row.itemName||item.categoryCode!==row.categoryCode){unknownItems++;codes.push("UNKNOWN_OR_MISMATCHED_ITEM");}
  else {presentItems.add(row.itemCode);if(!isOfficialFeeDimension(item,row.animalType as FeeAnimalType,row.weightClass as FeeWeightClass)){invalidDimensions++;codes.push("INVALID_ITEM_DIMENSION");}}
  const prices=[money(row.minimumPrice),money(row.medianPrice),money(row.averagePrice),money(row.maximumPrice)];
  if(prices.some(value=>value===undefined)){priceParsingErrors++;codes.push("PRICE_PARSE_ERROR");}
  const [minimumPrice,medianPrice,averagePrice,maximumPrice]=prices.map(value=>value===undefined?null:value) as (number|null)[];
  if(minimumPrice!==null&&maximumPrice!==null&&minimumPrice>maximumPrice){rangeErrors++;codes.push("MIN_GREATER_THAN_MAX");}
  if(medianPrice!==null&&((minimumPrice!==null&&medianPrice<minimumPrice)||(maximumPrice!==null&&medianPrice>maximumPrice))){medianErrors++;codes.push("MEDIAN_OUT_OF_RANGE");}
  if(averagePrice!==null&&((minimumPrice!==null&&averagePrice<minimumPrice)||(maximumPrice!==null&&averagePrice>maximumPrice))){averageErrors++;codes.push("AVERAGE_OUT_OF_RANGE");}
  const sampleCount=count(row.sampleCount);if(sampleCount===undefined)codes.push("SAMPLE_COUNT_PARSE_ERROR");
  const current=row.currentRegionSlug?regions.get(row.currentRegionSlug):undefined;
  if(row.regionLevel==="NATIONAL"&&row.currentRegionSlug){regionErrors++;codes.push("NATIONAL_MUST_NOT_MAP_REGION");}
  if(row.regionLevel!=="NATIONAL"&&row.currentRegionSlug&&!current){regionErrors++;codes.push("CURRENT_REGION_NOT_FOUND");}
  if(current&&current.level!==row.regionLevel){regionErrors++;codes.push("CURRENT_REGION_LEVEL_MISMATCH");}
  if(row.regionLevel==="CITY"&&!row.surveyCityName){regionErrors++;codes.push("SURVEY_CITY_REQUIRED");}
  if(row.regionLevel!=="NATIONAL"&&!row.surveyProvinceName){regionErrors++;codes.push("SURVEY_PROVINCE_REQUIRED");}
  let regionMatchStatus:FeeRegionMatchStatus="NOT_APPLICABLE";
  if(row.regionLevel!=="NATIONAL"){
   if(current){
    regionMatchStatus="MATCHED";regionMatched++;
    const currentProvince=current.level==="PROVINCE"?current.name:current.parent_name;
    const currentCity=current.level==="CITY"?current.name:null;
    if(currentProvince!==row.surveyProvinceName||currentCity!==(row.surveyCityName??null))historicalRegionMatched++;
   }
   else {regionMatchStatus="HISTORICAL_ONLY";historicalOnly++;}
  }
  if(codes.length)errors.push({row:index+1,codes:[...new Set(codes)]});
  rows.push({...row,minimumPrice,medianPrice,averagePrice,maximumPrice,sampleCount:sampleCount===undefined?null:sampleCount,currentRegionId:current?.id??null,regionMatchStatus});
 }
 const missingItems=officialFeeItems.filter(item=>!presentItems.has(item.itemCode)).map(item=>item.itemName);
 const alreadyImported=Boolean(existing.exists);const validRows=parsed.rows.length-errors.length;
 return {fileHash,surveyYear:parsed.surveyYear,sourceName:parsed.sourceName,sourceUrl:parsed.sourceUrl,sourceDate:parsed.sourceDate,totalRows:parsed.rows.length,validRows,regionMatched,historicalRegionMatched,historicalOnly,priceParsingErrors,rangeErrors,medianErrors,averageErrors,duplicateKeys,missingItems,unknownItems,invalidDimensions,regionErrors,alreadyImported,canImport:validRows===parsed.rows.length&&!missingItems.length&&!alreadyImported,errors:errors.slice(0,200),rows};
}

export async function importFeeFile(text:string,fileName:string,importedBy:string,audit?:{requestCount:number;reviewCount:number;startedAt:string;notes:string}){
 const preview=await previewFeeImport(text);if(!preview.canImport)throw new Error("FEE_IMPORT_PREVIEW_FAILED");
 const sql=getSql();return sql.begin(async tx=>{
  await tx`SELECT pg_advisory_xact_lock(774203003)`;
  const [duplicate]=await tx`SELECT EXISTS(SELECT 1 FROM fee_import_batches WHERE file_hash=${preview.fileHash} AND status='SUCCESS') AS exists`;
  if(duplicate.exists)throw new Error("ALREADY_IMPORTED");
  const [batch]=await tx`INSERT INTO fee_import_batches(survey_year,source_name,source_url,file_name,file_hash,imported_by,row_count,status)
   VALUES(${preview.surveyYear},${preview.sourceName},${preview.sourceUrl},${basename(fileName)},${preview.fileHash},${importedBy},${preview.totalRows},'RUNNING') RETURNING id`;
  const records=preview.rows.map(row=>({survey_year:preview.surveyYear,region_level:row.regionLevel,region_id:row.currentRegionId,current_region_id:row.currentRegionId,survey_region_code:row.surveyRegionCode??null,survey_province_name:row.surveyProvinceName??null,survey_city_name:row.surveyCityName??null,region_match_status:row.regionMatchStatus,province:row.surveyProvinceName??null,city:row.surveyCityName??null,category_code:row.categoryCode,item_code:row.itemCode,item_name:row.itemName,animal_type:row.animalType,weight_class:row.weightClass,unit:'원',minimum_price:row.minimumPrice,median_price:row.medianPrice,average_price:row.averagePrice,maximum_price:row.maximumPrice,sample_count:row.sampleCount,source_name:preview.sourceName,source_url:preview.sourceUrl,source_date:preview.sourceDate,import_batch_id:batch.id}));
  const columns=['survey_year','region_level','region_id','current_region_id','survey_region_code','survey_province_name','survey_city_name','region_match_status','province','city','category_code','item_code','item_name','animal_type','weight_class','unit','minimum_price','median_price','average_price','maximum_price','sample_count','source_name','source_url','source_date','import_batch_id'] as const;
  for(let offset=0;offset<records.length;offset+=250)await tx`INSERT INTO medical_fee_statistics ${tx(records.slice(offset,offset+250),...columns)}`;
  await tx`UPDATE fee_import_batches SET status='SUCCESS',success_count=${preview.totalRows},failed_count=0 WHERE id=${batch.id}`;
  if(audit)await tx`UPDATE fee_import_batches SET started_at=${audit.startedAt}::timestamptz,finished_at=now(),request_count=${audit.requestCount},review_count=${audit.reviewCount},notes=${audit.notes} WHERE id=${batch.id}`;
  await tx`INSERT INTO admin_audit_logs(admin,action,entity_type,entity_id,after_json) VALUES(${importedBy},'FEE_IMPORT','fee_import_batches',${batch.id},${tx.json({fileHash:preview.fileHash,rows:preview.totalRows,surveyYear:preview.surveyYear})})`;
  return {batchId:String(batch.id),imported:preview.totalRows};
 });
}

export async function rollbackFeeImport(batchId:string,rolledBackBy:string){
 return getSql().begin(async tx=>{
  await tx`SELECT pg_advisory_xact_lock(774203003)`;
  const [batch]=await tx`SELECT id,status FROM fee_import_batches WHERE id=${batchId}::uuid FOR UPDATE`;
  if(!batch||batch.status!=="SUCCESS")throw new Error("ACTIVE_BATCH_NOT_FOUND");
  await tx`UPDATE fee_import_batches SET status='ROLLED_BACK',rolled_back_at=now(),rolled_back_by=${rolledBackBy} WHERE id=${batchId}::uuid`;
  await tx`INSERT INTO admin_audit_logs(admin,action,entity_type,entity_id,before_json,after_json) VALUES(${rolledBackBy},'FEE_IMPORT_ROLLBACK','fee_import_batches',${batchId},${tx.json({status:"SUCCESS"})},${tx.json({status:"ROLLED_BACK"})})`;
  return {batchId,status:"ROLLED_BACK" as const};
 });
}
