import "./env";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { publicAdapters } from "@/data/adapters/mois";
import { sourceFiles } from "@/data/adapters/contract";
import { checksum, duplicateCandidate, normalizeImport } from "@/data/import-normalize";
import { closeSql, getSql } from "@/db/connection";
import { validateWgs84 } from "@/lib/geo";
import type { RegionView } from "@/lib/regions";
import { normalizeAddress } from "@/lib/normalizers";

type Incoming = ReturnType<typeof normalizeImport>;
type Cache = { summary: Record<string, unknown>; records: unknown[] };
const columns = [
  "public_source","public_source_id","facility_type","public_local_code","name","normalized_name",
  "phone_raw","phone_normalized","road_address","jibun_address","postal_code","region_id","province","city","district",
  "public_status_code","public_status_name","public_detail_status_code","public_detail_status_name","business_status",
  "license_date","license_cancel_date","closed_date","temporary_close_start","temporary_close_end","reopen_date",
  "source_x","source_y","source_crs","latitude","longitude","geo_status","region_status","source_updated_at","data_quality_score",
  "last_synced_at",
] as const;

function comparable(value: unknown) {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}
function changed(old: Record<string, unknown>, data: Incoming) {
  return Object.entries(data).some(([key, value]) => {
    const previous = old[key];
    if (typeof value === "number" && previous != null && Number.isFinite(Number(previous))) return Math.abs(value - Number(previous)) > 0.00001;
    return String(comparable(previous)) !== String(comparable(value));
  });
}
function duplicateKeys(data: Record<string, unknown>){
 const address=normalizeAddress(String(data.road_address||data.jibun_address||""));
 return [
  data.public_source_id?`id:${data.public_source_id}`:"",
  address&&data.normalized_name?`name-address:${data.normalized_name}|${address}`:"",
  address&&data.phone_normalized?`phone-address:${data.phone_normalized}|${address}`:"",
  data.normalized_name&&data.latitude!=null&&data.longitude!=null?`name-coordinate:${data.normalized_name}|${data.latitude}|${data.longitude}`:"",
 ].filter(Boolean);
}

async function transform(rows: Incoming[]) {
  const sql = getSql();
  const points = rows.flatMap((data, index) => {
    if (!data.source_x || !data.source_y || data.geo_status === "INVALID") return [];
    const x = Number(data.source_x), y = Number(data.source_y);
    return Number.isFinite(x) && Number.isFinite(y) ? [{ index, x, y }] : [];
  });
  if (!points.length) return;
  const result = await sql<Array<{ index: number; latitude: number; longitude: number }>>`
    SELECT index, ST_Y(g)::float8 AS latitude, ST_X(g)::float8 AS longitude FROM (
      SELECT p.index, ST_Transform(ST_SetSRID(ST_MakePoint(p.x,p.y),5174),4326) AS g
      FROM jsonb_to_recordset(${sql.json(points)}::jsonb) AS p(index integer,x double precision,y double precision)
    ) transformed`;
  for (const point of result) {
    const data = rows[point.index];
    data.geo_status = validateWgs84(point.latitude, point.longitude);
    if (data.geo_status === "VALID") { data.latitude = point.latitude; data.longitude = point.longitude; data.data_quality_score += 20; }
  }
}

async function main() {
  const started = Date.now();
  const requested=process.argv[2]??"hospital";
  const adapter=publicAdapters.find(item=>sourceFiles[item.sourceType]===requested);
  if(!adapter)throw new Error("INVALID_SOURCE");
  const sourceType=adapter.sourceType;
  const cache = JSON.parse(await readFile(`data/official/${requested}-national-dry-run.json`, "utf8")) as Cache;
  if (cache.summary.approved_for_sync !== true || !Array.isArray(cache.records) || cache.records.length !== cache.summary.total) throw new Error("DRY_RUN_NOT_APPROVED");
  const dataHash = createHash("sha256").update(JSON.stringify(cache.records)).digest("hex");
  if (dataHash !== cache.summary.data_sha256) throw new Error("DRY_RUN_CACHE_HASH_MISMATCH");
  const contract = await adapter.contract();
  if (!contract.mapping || checksum(contract) !== cache.summary.contract_checksum) throw new Error("DRY_RUN_CONTRACT_MISMATCH");
  const sql = getSql();
  const lock = await sql.reserve();
  let locked = false, runId: string | undefined, snapshotId: string | undefined;
  try {
    const [guard] = await lock`SELECT pg_try_advisory_lock(hashtext(${sourceType})) AS locked`;
    if (!guard.locked) throw new Error("SOURCE_ALREADY_RUNNING");
    locked = true;
    const approved = await lock`SELECT id FROM sync_source_snapshots WHERE source_type=${sourceType} AND contract_checksum=${checksum(contract)} AND record_count=100 AND approved_at IS NOT NULL AND baseline_metrics IS NOT NULL LIMIT 1`;
    if (!approved.length) throw new Error("CURRENT_BASELINE_NOT_APPROVED");
    const [run] = await lock<Array<{id:string}>>`INSERT INTO sync_runs(source_type,requested_count) VALUES(${sourceType},${cache.records.length}) RETURNING id`;
    runId = run.id;
    const activeRunId = run.id;
    const [snapshot] = await lock<Array<{id:string}>>`INSERT INTO sync_source_snapshots(source_type,sync_run_id,record_count,complete,contract_checksum) VALUES(${sourceType},${activeRunId},${cache.records.length},false,${checksum(contract)}) RETURNING id`;
    snapshotId = snapshot.id;
    const activeSnapshotId = snapshot.id;
    const regionRows = await lock<Array<Record<string, unknown>>>`
      SELECT r.id,r.parent_id,r.level,r.name,r.short_name,r.full_slug,
        coalesce(array_agg(a.alias_name) FILTER(WHERE a.alias_name IS NOT NULL),'{}') AS aliases
      FROM regions r LEFT JOIN region_aliases a ON a.region_id=r.id WHERE r.is_active GROUP BY r.id`;
    const regions: RegionView[] = regionRows.map((row) => ({id:Number(row.id),parentId:row.parent_id==null?undefined:Number(row.parent_id),level:row.level as RegionView["level"],name:String(row.name),shortName:String(row.short_name),fullSlug:String(row.full_slug),aliases:row.aliases as string[]}));
    const existingRows = await lock<Array<Record<string, unknown>>>`SELECT * FROM facilities WHERE public_source=${sourceType}`;
    const existing = new Map(existingRows.map((row) => [String(row.public_source_id), row]));
    const candidateIndexes=new Map<string,Record<string,unknown>[]>();
    const indexCandidate=(candidate:Record<string,unknown>)=>{for(const key of duplicateKeys(candidate))candidateIndexes.set(key,[...(candidateIndexes.get(key)??[]),candidate]);};
    existingRows.forEach(indexCandidate);
    const seen = new Set<string>();
    let created = 0, updated = 0, unchanged = 0, review = 0;
    const batchSize = 500;
    for (let offset = 0, batchNumber = 1; offset < cache.records.length; offset += batchSize, batchNumber++) {
      const rawBatch = cache.records.slice(offset, offset + batchSize);
      const normalized: Incoming[] = [];
      for (const raw of rawBatch) {
        const item = await adapter.normalize(raw);
        if (!adapter.validate(item).valid || seen.has(item.externalId)) throw new Error("CACHE_RECORD_INVALID_OR_DUPLICATE");
        seen.add(item.externalId);
        normalized.push(normalizeImport(item, regions, contract.mapping.sourceDateFormat));
      }
      await transform(normalized);
      const [batchLog] = await lock<Array<{id:string}>>`INSERT INTO sync_batches(sync_run_id,batch_number,first_row,last_row,status) VALUES(${activeRunId},${batchNumber},${offset+1},${offset+rawBatch.length},'RUNNING') RETURNING id`;
      try {
        const batchResult = await sql.begin(async (tx) => {
          const rawInsert = rawBatch.map((raw, index) => ({source_type:sourceType,facility_type:adapter.facilityType,external_id:normalized[index].public_source_id,payload_json:raw,checksum:checksum(raw)}));
          const rawRows = await tx<Array<{id:string;external_id:string}>>`INSERT INTO source_raw_records ${tx(rawInsert as never,"source_type","facility_type","external_id","payload_json","checksum")} ON CONFLICT(source_type,external_id,checksum) DO UPDATE SET fetched_at=now(),processing_status='PENDING',processing_error=NULL RETURNING id,external_id`;
          const rawIds = new Map<string,string>(rawRows.map((row) => [row.external_id,row.id]));
          const accepted: Incoming[] = [], reviews: Array<{data:Incoming;rawId:string;candidate:string|null;reason:string}>=[];
          const states = new Map<string,string>();
          for (const data of normalized) {
            const old = existing.get(data.public_source_id);
            const possible=[...new Set(duplicateKeys(data).flatMap(key=>candidateIndexes.get(key)??[]))];
            const duplicate = !old ? possible.find((candidate) => duplicateCandidate(data, candidate as never)) : undefined;
            if (duplicate) {
              reviews.push({data,rawId:rawIds.get(data.public_source_id)!,candidate:String(duplicate.public_source_id??"")||null,reason:String(duplicateCandidate(data,duplicate as never))});
              states.set(data.public_source_id,"REVIEW_REQUIRED");
              continue;
            }
            let state: string;
            if (!old) state = data.business_status === "CLOSED" ? "CLOSED" : "NEW";
            else if (old.business_status === "CLOSED" && data.business_status === "OPEN") state = "REOPENED";
            else if (old.business_status !== "CLOSED" && data.business_status === "CLOSED") state = "CLOSED";
            else state = changed(old,data) ? "UPDATED" : "UNCHANGED";
            states.set(data.public_source_id,state);
            accepted.push(data);
          }
          let returned: Array<{id:string;public_source_id:string}>=[];
          const writeRows = accepted.map((data) => ({...data,last_synced_at:new Date()}));
          if (writeRows.length) returned = await tx<Array<{id:string;public_source_id:string}>>`
            INSERT INTO facilities ${tx(writeRows as never, ...columns)}
            ON CONFLICT(public_source,public_source_id) DO UPDATE SET
              facility_type=EXCLUDED.facility_type,public_local_code=EXCLUDED.public_local_code,name=EXCLUDED.name,normalized_name=EXCLUDED.normalized_name,
              phone_raw=EXCLUDED.phone_raw,phone_normalized=EXCLUDED.phone_normalized,road_address=EXCLUDED.road_address,jibun_address=EXCLUDED.jibun_address,postal_code=EXCLUDED.postal_code,
              region_id=EXCLUDED.region_id,province=EXCLUDED.province,city=EXCLUDED.city,district=EXCLUDED.district,public_status_code=EXCLUDED.public_status_code,
              public_status_name=EXCLUDED.public_status_name,public_detail_status_code=EXCLUDED.public_detail_status_code,public_detail_status_name=EXCLUDED.public_detail_status_name,
              business_status=EXCLUDED.business_status,license_date=EXCLUDED.license_date,license_cancel_date=EXCLUDED.license_cancel_date,closed_date=EXCLUDED.closed_date,
              temporary_close_start=EXCLUDED.temporary_close_start,temporary_close_end=EXCLUDED.temporary_close_end,reopen_date=EXCLUDED.reopen_date,
              source_x=EXCLUDED.source_x,source_y=EXCLUDED.source_y,source_crs=EXCLUDED.source_crs,latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude,
              geo_status=EXCLUDED.geo_status,region_status=EXCLUDED.region_status,source_updated_at=EXCLUDED.source_updated_at,data_quality_score=EXCLUDED.data_quality_score,
              last_synced_at=now(),updated_at=now(),missing_streak=0,is_active=true
            RETURNING id,public_source_id`;
          const ids = returned.map((row) => row.id);
          if (ids.length) {
            await tx`INSERT INTO facility_features(facility_id) SELECT unnest(${ids}::uuid[]) ON CONFLICT(facility_id) DO NOTHING`;
            const presence = returned.map((row) => ({facility_id:row.id,source_type:sourceType,last_snapshot_id:activeSnapshotId,missing_streak:0,last_seen_at:new Date(),current_state:states.get(row.public_source_id)!,last_transition_at:new Date()}));
            await tx`INSERT INTO facility_source_presence ${tx(presence,"facility_id","source_type","last_snapshot_id","missing_streak","last_seen_at","current_state","last_transition_at")} ON CONFLICT(facility_id) DO UPDATE SET last_snapshot_id=EXCLUDED.last_snapshot_id,missing_streak=0,last_seen_at=EXCLUDED.last_seen_at,current_state=EXCLUDED.current_state,last_transition_at=EXCLUDED.last_transition_at`;
          }
          for (const item of reviews) {
            await tx`UPDATE source_raw_records SET processing_status='HELD_ANOMALY',processing_error='DUPLICATE_REVIEW_REQUIRED' WHERE id=${item.rawId}`;
            await tx`INSERT INTO facility_duplicate_reviews(raw_record_id,source_type,public_source_id,candidate_public_source_id,decision,reason_code,reviewed_by)
              VALUES(${item.rawId},${sourceType},${item.data.public_source_id},${item.candidate},'REVIEW_REQUIRED',${item.reason},'automatic-dry-run')
              ON CONFLICT(raw_record_id) DO UPDATE SET candidate_public_source_id=EXCLUDED.candidate_public_source_id,decision='REVIEW_REQUIRED',reason_code=EXCLUDED.reason_code,reviewed_by=EXCLUDED.reviewed_by,reviewed_at=now()`;
          }
          const processedIds = accepted.map((data) => rawIds.get(data.public_source_id)!);
          if (processedIds.length) await tx`UPDATE source_raw_records SET processing_status='PROCESSED',processing_error=NULL WHERE id=ANY(${processedIds}::uuid[])`;
          const counts = {created:accepted.filter((data)=>!existing.has(data.public_source_id)).length,updated:accepted.filter((data)=>existing.has(data.public_source_id)&&states.get(data.public_source_id)!=="UNCHANGED").length,unchanged:accepted.filter((data)=>states.get(data.public_source_id)==="UNCHANGED").length,review:reviews.length};
          for (const data of accepted) { const row=returned.find((item)=>item.public_source_id===data.public_source_id); const candidate={...data,id:row?.id};indexCandidate(candidate);existing.set(data.public_source_id,candidate); }
          return counts;
        });
        created += batchResult.created; updated += batchResult.updated; unchanged += batchResult.unchanged; review += batchResult.review;
        await lock`UPDATE sync_batches SET status='SUCCESS',created_count=${batchResult.created},updated_count=${batchResult.updated},unchanged_count=${batchResult.unchanged},review_count=${batchResult.review},finished_at=now() WHERE id=${batchLog.id}`;
        console.log(JSON.stringify({batch:batchNumber,rows:rawBatch.length,...batchResult}));
      } catch {
        await lock`UPDATE sync_batches SET status='FAILED',error_code='BATCH_TRANSACTION_FAILED',finished_at=now() WHERE id=${batchLog.id}`;
        throw new Error(`BATCH_${batchNumber}_FAILED`);
      }
    }
    await sql.begin(async (tx) => {
      await tx`UPDATE sync_source_snapshots SET complete=true WHERE id=${activeSnapshotId}`;
      await tx`UPDATE facilities SET missing_streak=missing_streak+1 WHERE public_source=${sourceType} AND NOT(public_source_id=ANY(${[...seen]}::text[]))`;
      await tx`UPDATE facility_source_presence SET missing_streak=missing_streak+1,current_state='MISSING_FROM_SOURCE',last_transition_at=now() WHERE source_type=${sourceType} AND last_snapshot_id IS DISTINCT FROM ${activeSnapshotId}::uuid`;
      await tx`UPDATE sync_runs SET status=${review?"PARTIAL":"SUCCESS"},finished_at=now(),received_count=${cache.records.length},created_count=${created},updated_count=${updated},unchanged_count=${unchanged},failed_count=${review} WHERE id=${activeRunId}`;
    });
    console.log(JSON.stringify({status:review?"PARTIAL":"SUCCESS",run_id:runId,snapshot_id:snapshotId,total:cache.records.length,created,updated,unchanged,review,duration_seconds:Number(((Date.now()-started)/1000).toFixed(1))}));
  } catch (error) {
    if (runId) await lock`UPDATE sync_runs SET status='FAILED',finished_at=now(),error_message='NATIONAL_BATCH_SYNC_FAILED' WHERE id=${runId}`;
    throw error;
  } finally {
    try { if (locked) await lock`SELECT pg_advisory_unlock(hashtext(${sourceType}))`; } finally { lock.release(); }
  }
}

main().catch((error)=>{console.error(error instanceof Error?error.message:"NATIONAL_SYNC_FAILED");process.exitCode=1;}).finally(closeSql);
