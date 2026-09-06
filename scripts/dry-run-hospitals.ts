import "./env";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { publicAdapters } from "@/data/adapters/mois";
import { checksum, duplicateCandidate, normalizeImport, type DuplicateComparable } from "@/data/import-normalize";
import { redactSample, sourceFiles } from "@/data/adapters/contract";
import { closeSql, getSql } from "@/db/connection";
import { validateWgs84 } from "@/lib/geo";
import type { RegionView } from "@/lib/regions";
import { normalizeAddress } from "@/lib/normalizers";

type Normalized = ReturnType<typeof normalizeImport>;
type Row = { raw: unknown; data: Normalized };

function percentage(value: number, total: number) {
  return total ? Number((value * 100 / total).toFixed(3)) : 0;
}

function countBy(rows: Row[], select: (row: Row) => string) {
  return Object.fromEntries([...rows.reduce((map, row) => {
    const key = select(row);
    map.set(key, (map.get(key) ?? 0) + 1);
    return map;
  }, new Map<string, number>())].sort(([a], [b]) => a.localeCompare(b)));
}

async function transformCoordinates(rows: Row[]) {
  const sql = getSql();
  const points = rows.flatMap((row, index) => {
    if (!row.data.source_x || !row.data.source_y || row.data.geo_status === "INVALID") return [];
    const x = Number(row.data.source_x), y = Number(row.data.source_y);
    return Number.isFinite(x) && Number.isFinite(y) ? [{ index, x, y }] : [];
  });
  if (!points.length) return;
  const transformed = await sql<Array<{ index: number; latitude: number; longitude: number }>>`
    SELECT index, ST_Y(g)::float8 AS latitude, ST_X(g)::float8 AS longitude
    FROM (
      SELECT p.index,
        ST_Transform(ST_SetSRID(ST_MakePoint(p.x, p.y), 5174), 4326) AS g
      FROM jsonb_to_recordset(${sql.json(points)}::jsonb)
        AS p(index integer, x double precision, y double precision)
    ) transformed
  `;
  for (const point of transformed) {
    const data = rows[point.index]?.data;
    if (!data) continue;
    data.geo_status = validateWgs84(point.latitude, point.longitude);
    if (data.geo_status === "VALID") {
      data.latitude = point.latitude;
      data.longitude = point.longitude;
      data.data_quality_score += 20;
    }
  }
}

function duplicateMetrics(rows: Row[]) {
  const sourceIds = new Set<string>();
  let sourceIdDuplicates = 0;
  let duplicateCandidates = 0;
  let reviewRequired = 0;
  const indexes = new Map<string, DuplicateComparable[]>();
  const add=(key:string,value:DuplicateComparable)=>indexes.set(key,[...(indexes.get(key)??[]),value]);
  for (const { data } of rows) {
    if (sourceIds.has(data.public_source_id)) sourceIdDuplicates++;
    sourceIds.add(data.public_source_id);
    const address=normalizeAddress(data.road_address||data.jibun_address||"");
    const keys=[
      `id:${data.public_source_id}`,
      address?`name-address:${data.normalized_name}|${address}`:"",
      address&&data.phone_normalized?`phone-address:${data.phone_normalized}|${address}`:"",
      data.latitude!=null&&data.longitude!=null?`name-coordinate:${data.normalized_name}|${data.latitude}|${data.longitude}`:"",
    ].filter(Boolean);
    const candidates=[...new Set(keys.flatMap(key=>indexes.get(key)??[]))];
    const duplicate = candidates.find((candidate) => duplicateCandidate(data, candidate));
    if (duplicate) {
      duplicateCandidates++;
      reviewRequired++;
    }
    for(const key of keys)add(key,data);
  }
  return { source_id_duplicates: sourceIdDuplicates, duplicate_candidates: duplicateCandidates, review_required: reviewRequired };
}

async function main() {
  const startedAt = new Date();
  const requested=process.argv[2]??"hospital";
  const adapter=publicAdapters.find(item=>sourceFiles[item.sourceType]===requested);
  if(!adapter)throw new Error("INVALID_SOURCE");
  const contract = await adapter.contract();
  const sql = getSql();
  const regionRows = await sql<Array<Record<string, unknown>>>`
    SELECT r.id, r.parent_id, r.level, r.name, r.short_name, r.full_slug,
      coalesce(array_agg(a.alias_name) FILTER (WHERE a.alias_name IS NOT NULL), '{}') AS aliases
    FROM regions r LEFT JOIN region_aliases a ON a.region_id = r.id
    WHERE r.is_active GROUP BY r.id
  `;
  const regions: RegionView[] = regionRows.map((row) => ({
    id: Number(row.id), parentId: row.parent_id == null ? undefined : Number(row.parent_id),
    level: row.level as RegionView["level"], name: String(row.name), shortName: String(row.short_name),
    fullSlug: String(row.full_slug), aliases: row.aliases as string[],
  }));
  const provinces = regions.filter((region) => region.level === "PROVINCE");
  const [integrity] = await sql<Array<{ orphan_count: number }>>`
    SELECT count(*)::int AS orphan_count FROM regions child
    WHERE child.is_active AND child.parent_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM regions parent WHERE parent.id = child.parent_id AND parent.is_active)
  `;
  if (!contract.mapping || !contract.response || !regions.length) throw new Error("DRY_RUN_PREFLIGHT_FAILED");

  const rows: Row[] = [];
  let expectedTotal: number | undefined;
  for (let page = 1; ; page++) {
    const response = await adapter.fetchPage({ page, pageSize: 100 });
    if (expectedTotal === undefined) expectedTotal = response.totalCount;
    if (expectedTotal == null || expectedTotal !== response.totalCount || expectedTotal > 200_000) throw new Error("UNSTABLE_API_TOTAL");
    for (const itemRaw of response.items) {
      const raw = redactSample(itemRaw, process.env.PUBLIC_DATA_SERVICE_KEY ?? "");
      const item = await adapter.normalize(raw);
      if (!adapter.validate(item).valid) throw new Error("INVALID_API_RECORD");
      rows.push({ raw, data: normalizeImport(item, regions, contract.mapping.sourceDateFormat) });
    }
    await transformCoordinates(rows.slice(-response.items.length));
    if (rows.length >= expectedTotal) break;
    if (!response.items.length) throw new Error("INCOMPLETE_API_PAGINATION");
    if (page % 20 === 0) console.log(JSON.stringify({ progress_rows: rows.length, expected_total: expectedTotal }));
  }
  if (expectedTotal == null || rows.length !== expectedTotal) throw new Error("DRY_RUN_COUNT_MISMATCH");

  const duplicate = duplicateMetrics(rows);
  const mapped = rows.filter((row) => row.data.region_status === "MATCHED").length;
  const coordinateValid = rows.filter((row) => row.data.geo_status === "VALID").length;
  const coordinateMissing = rows.filter((row) => row.data.geo_status === "MISSING").length;
  const coordinateInvalid = rows.length - coordinateValid - coordinateMissing;
  const byProvince = provinces.map((province) => {
    const provinceRows = rows.filter((row) => row.data.province === province.name);
    return {
      official_code: regionRows.find((region) => region.id === province.id)?.official_code ?? null,
      province: province.name,
      api_rows: provinceRows.length,
      open: provinceRows.filter((row) => row.data.business_status === "OPEN").length,
      closed: provinceRows.filter((row) => row.data.business_status === "CLOSED").length,
      region_mapped: provinceRows.filter((row) => row.data.region_status === "MATCHED").length,
      missing_coordinates: provinceRows.filter((row) => row.data.geo_status === "MISSING").length,
      review_required: duplicateMetrics(provinceRows).review_required,
    };
  }).sort((a, b) => a.province.localeCompare(b.province, "ko"));
  const statusDistribution = countBy(rows, (row) => row.data.business_status);
  const publicStatusDistribution = countBy(rows, (row) => `${row.data.public_status_code ?? ""}|${row.data.public_status_name ?? ""}`);
  const mappingRate = percentage(mapped, rows.length);
  const coordinateErrorRate = percentage(coordinateInvalid, rows.length);
  const gates = {
    complete_stable_response: rows.length === expectedTotal && rows.length >= (requested==="funeral"?100:5_000),
    region_mapping_at_least_99_percent: mappingRate >= 99,
    source_id_duplicate_critical_zero: duplicate.source_id_duplicates === 0,
    orphan_region_zero: integrity.orphan_count === 0,
    coordinate_error_reasonable: coordinateErrorRate <= 1,
    status_mapping_compatible: Number(statusDistribution.UNKNOWN ?? 0) <= Math.max(10, rows.length * 0.01),
    sixteen_current_provinces: provinces.length === 16,
  };
  const cacheRows = rows.map((row) => row.raw);
  const dataHash = createHash("sha256").update(JSON.stringify(cacheRows)).digest("hex");
  const summary = {
    kind: `${adapter.sourceType}_NATIONAL_DRY_RUN`,
    started_at: startedAt.toISOString(), finished_at: new Date().toISOString(),
    contract_checksum: checksum(contract), data_sha256: dataHash,
    total: rows.length,
    open: Number(statusDistribution.OPEN ?? 0), closed: Number(statusDistribution.CLOSED ?? 0),
    status_distribution: statusDistribution, public_status_distribution: publicStatusDistribution,
    region_mapped: mapped, region_unmatched: rows.length - mapped, region_mapping_rate_percent: mappingRate,
    region_review_samples: rows.filter((row) => row.data.region_status !== "MATCHED").slice(0, 50).map((row) => ({
      public_source_id: row.data.public_source_id,
      road_address: row.data.road_address,
      jibun_address: row.data.jibun_address,
      region_status: row.data.region_status,
    })),
    coordinate_valid: coordinateValid, coordinate_missing: coordinateMissing,
    coordinate_invalid: coordinateInvalid, coordinate_error_rate_percent: coordinateErrorRate,
    ...duplicate, orphan_regions: integrity.orphan_count,
    by_province: byProvince,
    gates, approved_for_sync: Object.values(gates).every(Boolean),
  };
  await mkdir("data/official", { recursive: true });
  await mkdir("docs/reports", { recursive: true });
  await writeFile(`data/official/${requested}-national-dry-run.json`, JSON.stringify({ summary, records: cacheRows }));
  await writeFile(`docs/reports/${requested}-national-dry-run.json`, JSON.stringify(summary, null, 2) + "\n");
  console.log(JSON.stringify(summary));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "DRY_RUN_FAILED");
  process.exitCode = 1;
}).finally(closeSql);
