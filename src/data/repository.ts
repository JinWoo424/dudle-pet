import type { FacilityKind, FacilityView, FeeStatisticView } from "@/domain/facility";
import postgres from "postgres";
import { mockFacilities, mockFeeStatistics } from "./mock";

function mockAllowed() {
  if (process.env.VERCEL_ENV === "production") return false;
  return process.env.USE_MOCK_DATA !== "false";
}

export async function listFacilities(type?: FacilityKind): Promise<FacilityView[]> {
  if (mockAllowed() || !process.env.DATABASE_URL) return mockFacilities.filter((item) => !type || item.type === type);
  const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
  try {
    const rows = await sql<Array<Record<string, unknown>>>`
      SELECT f.id, f.facility_type, f.name, f.phone_normalized, f.road_address, f.province, f.city, f.district, f.legal_dong,
             f.latitude, f.longitude, f.business_status, f.public_source, f.last_synced_at,
             ff.open_24h, ff.night_service, ff.exotic_service, ff.cat_service, ff.parking_available, ff.verification_status, ff.verified_at
      FROM facilities f LEFT JOIN facility_features ff ON ff.facility_id = f.id
      WHERE f.is_active = true AND (${type ?? null}::text IS NULL OR f.facility_type::text = ${type ?? null})
      ORDER BY f.data_quality_score DESC, f.name ASC
      LIMIT 1000
    `;
    return rows.map((row) => ({
      id: String(row.id), type: row.facility_type as FacilityKind, name: String(row.name), phone: row.phone_normalized ? String(row.phone_normalized) : undefined,
      roadAddress: String(row.road_address ?? "주소 정보 없음"), province: String(row.province ?? ""), city: String(row.city ?? ""), district: row.district ? String(row.district) : undefined,
      legalDong: row.legal_dong ? String(row.legal_dong) : undefined, latitude: row.latitude == null ? undefined : Number(row.latitude), longitude: row.longitude == null ? undefined : Number(row.longitude),
      businessStatus: row.business_status as FacilityView["businessStatus"], sourceName: String(row.public_source), sourceDate: row.last_synced_at ? new Date(String(row.last_synced_at)).toISOString().slice(0, 10) : "기준일 미확인",
      features: { open24h: (row.open_24h ?? "UNKNOWN") as FacilityView["features"]["open24h"], nightService: (row.night_service ?? "UNKNOWN") as FacilityView["features"]["nightService"], exoticService: (row.exotic_service ?? "UNKNOWN") as FacilityView["features"]["exoticService"], catService: (row.cat_service ?? "UNKNOWN") as FacilityView["features"]["catService"], parkingAvailable: (row.parking_available ?? "UNKNOWN") as FacilityView["features"]["parkingAvailable"], verificationStatus: (row.verification_status ?? "UNVERIFIED") as FacilityView["features"]["verificationStatus"], verifiedAt: row.verified_at ? new Date(String(row.verified_at)).toISOString().slice(0, 10) : undefined },
    }));
  } finally { await sql.end(); }
}

export async function getFacility(id: string) {
  return (await listFacilities()).find((item) => item.id === id) ?? null;
}

export async function searchFacilities(query: string) {
  const normalized = query.replace(/\s+/g, "").toLocaleLowerCase("ko-KR");
  return (await listFacilities()).filter((item) => [item.name, item.roadAddress, item.city, item.district, item.legalDong].filter(Boolean).some((value) => value!.replace(/\s+/g, "").toLocaleLowerCase("ko-KR").includes(normalized)));
}

export async function listFeeStatistics(itemCode?: string): Promise<FeeStatisticView[]> {
  if (mockAllowed() || !process.env.DATABASE_URL) return mockFeeStatistics.filter((item) => !itemCode || item.itemCode === itemCode);
  const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
  try {
    const rows = await sql<Array<Record<string, unknown>>>`SELECT survey_year, region_level, province, city, item_code, item_name, minimum_price, median_price, average_price, maximum_price, sample_count, source_name FROM medical_fee_statistics WHERE (${itemCode ?? null}::text IS NULL OR item_code = ${itemCode ?? null}) ORDER BY survey_year DESC, region_level DESC`;
    return rows.map((row) => ({ itemCode: String(row.item_code), itemName: String(row.item_name), region: row.region_level === "CITY" ? String(row.city ?? "") : row.region_level === "PROVINCE" ? String(row.province ?? "") : "전국", regionLevel: row.region_level as FeeStatisticView["regionLevel"], surveyYear: Number(row.survey_year), minimumPrice: row.minimum_price == null ? null : Number(row.minimum_price), medianPrice: row.median_price == null ? null : Number(row.median_price), averagePrice: row.average_price == null ? null : Number(row.average_price), maximumPrice: row.maximum_price == null ? null : Number(row.maximum_price), sampleCount: row.sample_count == null ? null : Number(row.sample_count), sourceName: String(row.source_name) }));
  } finally { await sql.end(); }
}

export function isMockMode() { return mockAllowed() || !process.env.DATABASE_URL; }
