import "./env";
import { closeSql, getSql } from "@/db/connection";
import { normalizeAddress, normalizeName, normalizePhone } from "@/lib/normalizers";

type Payload = Record<string, unknown>;

function value(payload: Payload, key: string) {
  const item = payload[key];
  return item == null ? null : String(item).trim() || null;
}

function reviewDecision(raw: ReturnType<typeof project>, candidates: ReturnType<typeof project>[]) {
  const sameSource = candidates.find((candidate) => candidate.public_source_id === raw.public_source_id);
  if (sameSource) return { decision: "MERGE", reason: "SAME_PUBLIC_SOURCE_ID", candidate: sameSource.public_source_id };

  const sameLicense = candidates.find((candidate) =>
    candidate.normalized_name === raw.normalized_name &&
    candidate.normalized_address === raw.normalized_address &&
    candidate.license_date === raw.license_date,
  );
  if (sameLicense) return { decision: "MERGE", reason: "NAME_ADDRESS_LICENSE_DATE", candidate: sameLicense.public_source_id };

  const samePhone = candidates.find((candidate) =>
    candidate.normalized_name === raw.normalized_name &&
    candidate.normalized_address === raw.normalized_address &&
    raw.phone_normalized && candidate.phone_normalized === raw.phone_normalized,
  );
  if (samePhone) return { decision: "MERGE", reason: "NAME_PHONE_ADDRESS", candidate: samePhone.public_source_id };

  const samePlaceDifferentLicense = candidates.find((candidate) =>
    candidate.normalized_address === raw.normalized_address &&
    candidate.public_source_id !== raw.public_source_id &&
    candidate.license_date && raw.license_date && candidate.license_date !== raw.license_date,
  );
  if (samePlaceDifferentLicense) {
    return { decision: "KEEP_SEPARATE", reason: "SAME_LOCATION_DISTINCT_LICENSE", candidate: samePlaceDifferentLicense.public_source_id };
  }
  return { decision: "REVIEW_REQUIRED", reason: "INSUFFICIENT_DISTINGUISHING_EVIDENCE", candidate: null };
}

function project(input: {
  public_source_id: string;
  name: string;
  road_address: string | null;
  jibun_address: string | null;
  phone: string | null;
  license_date: string | null;
  closed_date: string | null;
  source_x: string | null;
  source_y: string | null;
  source_updated_at: string | null;
}) {
  return {
    ...input,
    management_id: input.public_source_id,
    normalized_name: normalizeName(input.name),
    normalized_address: normalizeAddress(input.road_address || input.jibun_address || ""),
    phone_normalized: normalizePhone(input.phone ?? undefined),
  };
}

async function main() {
  const sql = getSql();
  const held = await sql<Array<{ id: string; payload_json: Payload }>>`
    SELECT id, payload_json
    FROM source_raw_records
    WHERE source_type = 'MOIS_ANIMAL_HOSPITAL'
      AND processing_status = 'HELD_ANOMALY'
      AND processing_error = 'DUPLICATE_REVIEW_REQUIRED'
      AND coalesce(payload_json->>'ROAD_NM_ADDR', payload_json->>'LOTNO_ADDR', '') LIKE '%여수시%'
    ORDER BY payload_json->>'MNG_NO'
  `;
  const facilities = await sql<Array<Record<string, unknown>>>`
    SELECT public_source_id, name, road_address, jibun_address, phone_raw AS phone,
      license_date::text, closed_date::text, source_x, source_y,
      source_updated_at::text
    FROM facilities
    WHERE public_source = 'MOIS_ANIMAL_HOSPITAL'
      AND (road_address LIKE '%여수시%' OR jibun_address LIKE '%여수시%')
    ORDER BY public_source_id
  `;
  const projectedFacilities = facilities.map((row) => project(row as Parameters<typeof project>[0]));
  const result = held.map(({ id, payload_json: payload }) => {
    const raw = project({
      public_source_id: value(payload, "MNG_NO") ?? "",
      name: value(payload, "BPLC_NM") ?? "",
      road_address: value(payload, "ROAD_NM_ADDR"),
      jibun_address: value(payload, "LOTNO_ADDR"),
      phone: value(payload, "TELNO"),
      license_date: value(payload, "LCPMT_YMD"),
      closed_date: value(payload, "CLSBIZ_YMD"),
      source_x: value(payload, "CRD_INFO_X"),
      source_y: value(payload, "CRD_INFO_Y"),
      source_updated_at: value(payload, "LAST_MDFCN_PNT"),
    });
    const candidates = projectedFacilities.filter((candidate) =>
      candidate.normalized_name === raw.normalized_name ||
      candidate.normalized_address === raw.normalized_address ||
      (raw.phone_normalized && candidate.phone_normalized === raw.phone_normalized),
    );
    return { raw_record_id: id, raw, decision: reviewDecision(raw, candidates), candidates };
  });
  if (process.argv.includes("--apply")) {
    if (result.some((item) => item.decision.decision === "REVIEW_REQUIRED")) throw new Error("UNRESOLVED_REVIEW_EXISTS");
    await sql.begin(async (tx) => {
      for (const item of result) {
        await tx`INSERT INTO facility_duplicate_reviews(
          raw_record_id, source_type, public_source_id, candidate_public_source_id,
          decision, reason_code, review_details, reviewed_by
        ) VALUES(
          ${item.raw_record_id}, 'MOIS_ANIMAL_HOSPITAL', ${item.raw.public_source_id},
          ${item.decision.candidate}, ${item.decision.decision}, ${item.decision.reason},
          ${tx.json({
            name: item.raw.name,
            normalized_name: item.raw.normalized_name,
            road_address: item.raw.road_address,
            jibun_address: item.raw.jibun_address,
            phone_normalized: item.raw.phone_normalized,
            license_date: item.raw.license_date,
            closed_date: item.raw.closed_date,
            source_x: item.raw.source_x,
            source_y: item.raw.source_y,
            source_updated_at: item.raw.source_updated_at,
          })}, 'codex-local-review'
        ) ON CONFLICT(raw_record_id) DO UPDATE SET
          candidate_public_source_id = EXCLUDED.candidate_public_source_id,
          decision = EXCLUDED.decision, reason_code = EXCLUDED.reason_code,
          review_details = EXCLUDED.review_details, reviewed_by = EXCLUDED.reviewed_by,
          reviewed_at = now()`;
      }
    });
  }
  console.log(JSON.stringify({ held_count: result.length, reviews: result }, null, 2));
}

main().finally(closeSql);
