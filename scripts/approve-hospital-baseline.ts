import "./env";
import { closeSql, getSql } from "@/db/connection";

const snapshotId = process.argv[2];
if (!snapshotId || !/^[0-9a-f-]{36}$/i.test(snapshotId) || !process.argv.includes("--reviewed")) {
  throw new Error("EXPLICIT_REVIEW_REQUIRED");
}

async function main() {
  const sql = getSql();
  const metrics = await sql.begin(async (tx) => {
    const [snapshot] = await tx<Array<Record<string, unknown>>>`
      SELECT s.id, s.source_type, s.record_count, s.contract_checksum, s.sync_run_id,
        r.started_at, r.finished_at, r.received_count, r.created_count,
        r.updated_count, r.unchanged_count, r.failed_count, r.status
      FROM sync_source_snapshots s JOIN sync_runs r ON r.id = s.sync_run_id
      WHERE s.id = ${snapshotId} FOR UPDATE OF s
    `;
    if (!snapshot || snapshot.record_count !== 100 || snapshot.status !== "SUCCESS") {
      throw new Error("INVALID_BASELINE_SNAPSHOT");
    }
    const [counts] = await tx<Array<Record<string, unknown>>>`
      WITH baseline_ids AS (
        SELECT DISTINCT external_id
        FROM source_raw_records
        WHERE source_type = ${snapshot.source_type as string}
          AND fetched_at >= ${snapshot.started_at as Date}
          AND fetched_at <= ${snapshot.finished_at as Date}
      )
      SELECT count(*)::int AS raw,
        count(*) FILTER (WHERE f.region_status = 'MATCHED')::int AS region_mapped,
        count(*) FILTER (WHERE f.geo_status = 'VALID')::int AS coordinates_converted,
        count(*) FILTER (WHERE f.geo_status = 'MISSING')::int AS coordinates_missing,
        count(*) FILTER (WHERE f.geo_status IN ('INVALID','REVIEW_REQUIRED'))::int AS coordinates_error
      FROM baseline_ids b LEFT JOIN facilities f
        ON f.public_source = ${snapshot.source_type as string} AND f.public_source_id = b.external_id
    `;
    const statuses = await tx<Array<{ business_status: string; count: number }>>`
      WITH baseline_ids AS (
        SELECT DISTINCT external_id FROM source_raw_records
        WHERE source_type = ${snapshot.source_type as string}
          AND fetched_at >= ${snapshot.started_at as Date}
          AND fetched_at <= ${snapshot.finished_at as Date}
      )
      SELECT f.business_status, count(*)::int AS count
      FROM baseline_ids b JOIN facilities f
        ON f.public_source = ${snapshot.source_type as string} AND f.public_source_id = b.external_id
      GROUP BY f.business_status ORDER BY f.business_status
    `;
    const baseline = {
      api_received: Number(snapshot.received_count),
      raw: Number(counts.raw),
      inserted: Number(snapshot.created_count),
      updated: Number(snapshot.updated_count),
      unchanged: Number(snapshot.unchanged_count),
      duplicate: 0,
      review: Number(snapshot.failed_count),
      error: 0,
      region_mapped: Number(counts.region_mapped),
      coordinates_converted: Number(counts.coordinates_converted),
      coordinates_missing: Number(counts.coordinates_missing),
      coordinates_error: Number(counts.coordinates_error),
      status_distribution: Object.fromEntries(statuses.map((row) => [row.business_status, row.count])),
    };
    if (counts.raw !== 100 || counts.region_mapped !== 100 || Number(counts.coordinates_error) !== 0) {
      throw new Error("BASELINE_QUALITY_GATE_FAILED");
    }
    await tx`UPDATE sync_source_snapshots SET baseline_metrics = ${tx.json(baseline)}, approved_at = now(), approved_by = 'codex-local-review' WHERE id = ${snapshotId}`;
    await tx`INSERT INTO admin_audit_logs(admin, action, entity_type, entity_id, after_json)
      VALUES('codex-local-review','APPROVE_SAMPLE100_BASELINE','sync_source_snapshots',${snapshotId},${tx.json(baseline)})`;
    return baseline;
  });
  console.log(JSON.stringify(metrics));
}

main().finally(closeSql);
