import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { getSql } from "@/db/connection";
import { dataMode } from "@/lib/data-mode";
import { publicAdapters } from "./adapters/mois";
import { redactSample, sourceFiles } from "./adapters/contract";
import { checksum, normalizeImport, duplicateCandidate } from "./import-normalize";
import { detectAnomalies } from "@/lib/anomaly";
import type { RegionView } from "@/lib/regions";
import { validateWgs84 } from "@/lib/geo";
type Adapter=(typeof publicAdapters)[number];
type Incoming=ReturnType<typeof normalizeImport>;
function snapshot(rows:Array<{business_status:string;region_id:unknown;geo_status:string}>){
 return {total:rows.length,closed:rows.filter(r=>r.business_status==="CLOSED").length,invalidCoordinates:rows.filter(r=>r.geo_status==="INVALID"||r.geo_status==="REVIEW_REQUIRED").length,
 byRegion:rows.reduce<Record<string,number>>((out,r)=>{const key=String(r.region_id??"unmatched");out[key]=(out[key]??0)+1;return out;},{})};
}
export async function syncSource(adapter:Adapter,stage:"sample100"|"targeted"|"full",deadline=Date.now()+30*60*1000,options?:{filters?:Record<string,string>;rawGuard?:(raw:unknown)=>boolean}){
 let phase="PREFLIGHT";
 if(dataMode()!=="database")throw new Error("SYNC_REQUIRES_DATABASE_MODE");
 const c=await adapter.contract();
 if(!c.mapping||!c.response)throw new Error("MAPPING_NOT_CONFIRMED");
 const sample=await readFile(`docs/api-samples/${sourceFiles[adapter.sourceType]}.json`,"utf8");
 if(createHash("sha256").update(sample).digest("hex")!==c.mapping.sampleSha256)throw new Error("SAMPLE_HASH_MISMATCH");
 const inspected=await adapter.parse(JSON.parse(sample));
 if(inspected.items.length!==5)throw new Error("FIVE_RECORD_INSPECTION_REQUIRED");
 for(const raw of inspected.items){if(!adapter.validate(await adapter.normalize(raw)).valid)throw new Error("SAMPLE_INVALID");}
 const sql=getSql();const lock=await sql.reserve();
 let runId:string|undefined;let locked=false;
 try{
  const [guard]=await lock`SELECT pg_try_advisory_lock(hashtext(${adapter.sourceType})) AS locked`;
  if(!guard.locked)throw new Error("SOURCE_ALREADY_RUNNING");locked=true;
  if(stage==="full"){
   const approvals=await lock`SELECT id FROM sync_source_snapshots WHERE source_type=${adapter.sourceType} AND contract_checksum=${checksum(c)} AND record_count=100 AND approved_at IS NOT NULL LIMIT 1`;
   if(!approvals.length)throw new Error("HUNDRED_RECORD_REVIEW_REQUIRED");
  }
  phase="CREATE_RUN";const [run]=await lock`INSERT INTO sync_runs(source_type,requested_count) VALUES(${adapter.sourceType},${stage==="full"?0:100}) RETURNING id`;runId=run.id;
  const rawRows:Array<{raw:unknown;rawId:string}>=[];
  let total:number|undefined;
  phase="FETCH_AND_STORE_RAW";for(let page=1;;page++){
   if(Date.now()>deadline)throw new Error("SYNC_TIME_BUDGET_EXCEEDED");
   const data=await adapter.fetchPage({page,pageSize:100,filters:options?.filters});
   if(total===undefined)total=data.totalCount;
   if(total===undefined||total!==data.totalCount||total>200000||data.items.length>100||stage==="sample100"&&total<100||stage==="targeted"&&(total<1||total>100))throw new Error("INVALID_SNAPSHOT_TOTAL");
   if(!data.items.length&&rawRows.length<total)throw new Error("INCOMPLETE_PAGINATION");
   for(const itemRaw of data.items){
    if(options?.rawGuard&&!options.rawGuard(itemRaw))throw new Error("TARGET_FILTER_GUARD_FAILED");
    const raw=redactSample(itemRaw,process.env.PUBLIC_DATA_SERVICE_KEY??"");
    const hash=checksum(raw);
    const field=c.mapping.fields.externalId!;
    const external=raw&&typeof raw==="object"?String((raw as Record<string,unknown>)[field]??""):"";
    const [record]=await lock`INSERT INTO source_raw_records(source_type,facility_type,external_id,payload_json,checksum)
     VALUES(${adapter.sourceType},${adapter.facilityType},${external||"unidentified:"+hash},${lock.json(raw as never)},${hash})
     ON CONFLICT(source_type,external_id,checksum) DO UPDATE SET fetched_at=now() RETURNING id`;
    rawRows.push({raw,rawId:record.id});
   }
   if(stage==="sample100"||rawRows.length>=total)break;
  }
  if(stage==="sample100"&&rawRows.length!==100||stage!=="sample100"&&rawRows.length!==total)throw new Error("INCOMPLETE_SNAPSHOT");
  phase="LOAD_REGIONS";const regionRows=await lock`SELECT r.id,r.parent_id,r.level,r.name,r.short_name,r.full_slug,coalesce(array_agg(a.alias_name) FILTER(WHERE a.alias_name IS NOT NULL),'{}') AS aliases FROM regions r LEFT JOIN region_aliases a ON a.region_id=r.id WHERE r.is_active GROUP BY r.id`;
  const regions:RegionView[]=regionRows.map(r=>({id:r.id,parentId:r.parent_id,level:r.level,name:r.name,shortName:r.short_name,fullSlug:r.full_slug,aliases:r.aliases}));
  if(!regions.length)throw new Error("REGIONS_NOT_IMPORTED");
  const incoming:Array<{data:Incoming;rawId:string}>=[];const seen=new Set<string>();
  phase="NORMALIZE";for(const record of rawRows){
   try{
    const item=await adapter.normalize(record.raw);
    if(!adapter.validate(item).valid)throw new Error("INVALID_NORMALIZED_RECORD");
    if(seen.has(item.externalId))throw new Error("DUPLICATE_SOURCE_ID");
    const data=normalizeImport(item,regions,c.mapping.sourceDateFormat);
    if(item.sourceX&&item.sourceY&&data.geo_status!=="INVALID"){
     const x=Number(c.mapping.coordinateOrder==="EASTING_NORTHING"?item.sourceX:item.sourceY);
     const y=Number(c.mapping.coordinateOrder==="EASTING_NORTHING"?item.sourceY:item.sourceX);
     const [point]=await lock`SELECT ST_Y(g) AS latitude,ST_X(g) AS longitude FROM (SELECT ST_Transform(ST_SetSRID(ST_MakePoint(${x},${y}),5174),4326) AS g) p`;
     data.geo_status=validateWgs84(Number(point.latitude),Number(point.longitude));
     if(data.geo_status==="VALID"){data.latitude=Number(point.latitude);data.longitude=Number(point.longitude);data.data_quality_score+=20;}
    }
    seen.add(item.externalId);incoming.push({data,rawId:record.rawId});
   }catch{
    await lock`UPDATE source_raw_records SET processing_status='FAILED',processing_error='NORMALIZATION_OR_DUPLICATE_FAILURE' WHERE id=${record.rawId}`;
    throw new Error("NORMALIZATION_FAILURE");
   }
  }
  phase="LOAD_EXISTING";const previous=await lock`SELECT * FROM facilities WHERE public_source=${adapter.sourceType}`;
  const knownBefore=previous.filter(r=>r.business_status!=="UNKNOWN").length;
  const unknownAfter=incoming.filter(r=>r.data.business_status==="UNKNOWN").length;
  const statusRegression=knownBefore>0&&unknownAfter>Math.max(5,incoming.length*.1);
  const regionRegression=previous.filter(r=>r.region_status==="MATCHED").length>0&&incoming.filter(r=>r.data.region_status==="MATCHED").length<previous.filter(r=>r.region_status==="MATCHED").length*.8;
  if(stage==="full"&&(statusRegression||regionRegression||detectAnomalies(snapshot(previous as never),snapshot(incoming.map(r=>r.data))).blocked)){
   await lock`UPDATE source_raw_records SET processing_status='HELD_ANOMALY',processing_error='SNAPSHOT_ANOMALY' WHERE id=ANY(${rawRows.map(r=>r.rawId)}::uuid[])`;
   await lock`UPDATE sync_runs SET status='BLOCKED_ANOMALY',finished_at=now(),received_count=${rawRows.length},error_message='SNAPSHOT_ANOMALY' WHERE id=${runId!}`;
   return {source:adapter.sourceType,status:"BLOCKED_ANOMALY",runId};
  }
  if(Date.now()>deadline)throw new Error("SYNC_TIME_BUDGET_EXCEEDED");
  // reserve() pins the advisory-lock connection but intentionally exposes no
  // transaction helper. Commit the write set through the pool while the
  // reserved connection continues to hold the source lock.
  phase="UPSERT_SNAPSHOT";const result=await sql.begin(async tx=>{
   let created=0,updated=0,unchanged=0,held=0;
   const [snap]=await tx`INSERT INTO sync_source_snapshots(source_type,sync_run_id,record_count,complete,contract_checksum) VALUES(${adapter.sourceType},${runId!},${incoming.length},${stage==="full"},${checksum(c)}) RETURNING id`;
   phase="UPSERT_ROWS";const candidates=[...previous] as unknown as Array<Incoming&{id:string}>;
   for(const {data,rawId} of incoming){
    const old=candidates.find(r=>r.public_source_id===data.public_source_id);
    if(old&&old.source_updated_at&&(!data.source_updated_at||+new Date(old.source_updated_at)>+data.source_updated_at)){
     held++;await tx`UPDATE source_raw_records SET processing_status='HELD_ANOMALY',processing_error='SOURCE_TIMESTAMP_REGRESSION' WHERE id=${rawId}`;continue;
    }
    if(!old&&candidates.some(r=>duplicateCandidate(data,r))){
     held++;await tx`UPDATE source_raw_records SET processing_status='HELD_ANOMALY',processing_error='DUPLICATE_REVIEW_REQUIRED' WHERE id=${rawId}`;continue;
    }
    let id=old?.id;
    if(old){
     const changes=Object.entries(data).filter(([key,value])=>{
      const previous=(old as unknown as Record<string,unknown>)[key];
      const convert=(v:unknown)=>v instanceof Date?v.toISOString():v==null?null:String(v);
      return convert(previous)!==convert(value);
     });
     for(const[field,beforeAfter]of changes){await tx`INSERT INTO facility_changes(facility_id,field_name,old_value,new_value,source_type) VALUES(${old.id},${field},${String((old as unknown as Record<string,unknown>)[field]??"")},${String(beforeAfter??"")},${adapter.sourceType})`;}
     await tx`UPDATE facilities SET ${tx(data)},last_synced_at=now(),updated_at=now(),missing_streak=0,is_active=true WHERE id=${old.id}`;
     if(changes.length)updated++;else unchanged++;
    }else{
     const [inserted]=await tx`INSERT INTO facilities ${tx({...data,last_synced_at:new Date()})} RETURNING id`;id=inserted.id;created++;candidates.push({...data,id:id!});
    }
    await tx`INSERT INTO facility_features(facility_id) VALUES(${id!}) ON CONFLICT(facility_id) DO NOTHING`;
    await tx`INSERT INTO facility_source_presence(facility_id,source_type,last_snapshot_id,last_seen_at) VALUES(${id!},${adapter.sourceType},${snap.id},now()) ON CONFLICT(facility_id) DO UPDATE SET last_snapshot_id=EXCLUDED.last_snapshot_id,last_seen_at=now(),missing_streak=0`;
    await tx`UPDATE source_raw_records SET processing_status='PROCESSED',processing_error=NULL WHERE id=${rawId}`;
   }
   // Missing records are tracked only after complete, validated snapshots.
   // Absence never infers closure or deletes an existing facility.
   if(stage==="full"&&!held){
    await tx`UPDATE facilities SET missing_streak=missing_streak+1 WHERE public_source=${adapter.sourceType} AND NOT(public_source_id=ANY(${[...seen]}::text[]))`;
    await tx`UPDATE facility_source_presence SET missing_streak=missing_streak+1 WHERE source_type=${adapter.sourceType} AND last_snapshot_id IS DISTINCT FROM ${snap.id}::uuid`;
   }
   await tx`UPDATE sync_runs SET status=${held?"PARTIAL":"SUCCESS"},finished_at=now(),received_count=${incoming.length},created_count=${created},updated_count=${updated},unchanged_count=${unchanged},failed_count=${held} WHERE id=${runId!}`;
   return {created,updated,unchanged,held,snapshotId:snap.id};
  });
  return {source:adapter.sourceType,status:result.held?"PARTIAL":"SUCCESS",runId,...result};
 }catch(error){
  const dbCode=typeof (error as {code?:unknown}).code==="string"&&/^[A-Z0-9_]{2,20}$/.test((error as {code:string}).code)?`_${(error as {code:string}).code}`:"";
  if(runId)await lock`UPDATE sync_runs SET status='FAILED',finished_at=now(),error_message=${`SYNC_FAILED_${phase}${dbCode}`} WHERE id=${runId}`;
  throw new Error(`SYNC_FAILED_${phase}${dbCode}`);
 }finally{
  try{if(locked)await lock`SELECT pg_advisory_unlock(hashtext(${adapter.sourceType}))`;}finally{lock.release();}
 }
}
