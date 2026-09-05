import type { FacilityKind, FacilityView, FeeStatisticView } from "@/domain/facility";
import { getSql } from "@/db/connection";
import { dataMode } from "@/lib/data-mode";
import { developmentRegions, type RegionView, type Feature, featureKeys } from "@/lib/regions";
import { mockFacilities, mockFeeStatistics } from "./mock";
import { distanceMeters } from "@/lib/geo";
import { unstable_cache } from "next/cache";
import { cache } from "react";

export function isMockMode() { return dataMode() === "mock"; }
export interface FacilityQuery { type?: FacilityKind; regionSlug?: string; search?: string; feature?: Feature; page?: number; sort?: string; id?: string }
const mockRows = () => mockFacilities.map(f => ({ ...f, regionSlug: "jeonnam/yeosu", syncedAt: f.sourceDate }));
type Row = Record<string, unknown>;
export function mapFacility(row: Row): FacilityView {
 const tri = (key: string) => (row[key] === "YES" || row[key] === "NO" ? row[key] : "UNKNOWN") as "YES" | "NO" | "UNKNOWN";
 const date = (key: string) => row[key] ? new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Seoul"}).format(new Date(String(row[key]))) : undefined;
 return {
 id: String(row.id), type: row.facility_type as FacilityKind, name: String(row.name), phone: row.phone_normalized ? String(row.phone_raw||row.phone_normalized) : undefined,
 roadAddress: String(row.road_address || row.jibun_address || ""), province: String(row.province ?? ""), city: String(row.city ?? ""),
 regionSlug: row.full_slug ? String(row.full_slug) : undefined, district: row.district ? String(row.district) : undefined, legalDong: row.legal_dong ? String(row.legal_dong) : undefined,
 latitude: row.geo_status === "VALID" && row.latitude != null ? Number(row.latitude) : undefined, longitude: row.geo_status === "VALID" && row.longitude != null ? Number(row.longitude) : undefined,
 businessStatus: row.business_status as FacilityView["businessStatus"], sourceName: String(row.public_source), sourceDate: date("source_updated_at") ?? "미확인", syncedAt: date("last_synced_at"), updatedAt: date("updated_at"),
 features: { open24h: tri("open_24h"), nightService: tri("night_service"), exoticService: tri("exotic_service"), catService: tri("cat_service"), parkingAvailable: tri("parking_available"), verificationStatus: row.verified_at ? "VALID" : "UNVERIFIED", verifiedAt: date("verified_at"), sourceLabel: row.evidence_note ? String(row.evidence_note) : undefined },
 distanceMeters: row.distance_meters == null ? undefined : Number(row.distance_meters),
 verifications: Array.isArray(row.verification_evidence)?row.verification_evidence as FacilityView["verifications"]:[],
 };
}
const databaseRegions=unstable_cache(async():Promise<RegionView[]>=>{
 const rows = await getSql()`SELECT id,parent_id,level,name,short_name,full_slug FROM regions ORDER BY full_slug`;
 return rows.map(r => ({ id:r.id, parentId:r.parent_id ?? undefined, level:r.level, name:r.name, shortName:r.short_name, fullSlug:r.full_slug }));
},["region-registry-v1"],{revalidate:3600,tags:["regions"]});
export async function listRegions():Promise<RegionView[]>{return isMockMode()?developmentRegions:databaseRegions();}
export async function resolveRegion(slug: string) { return (await listRegions()).find(r => r.fullSlug === slug) ?? null; }
export async function queryFacilities(query: FacilityQuery = {}) {
 const page = Number.isFinite(query.page) ? Math.max(1, Math.min(10000, Math.floor(query.page!))) : 1; const size = 30;
 if (isMockMode()) {
  let rows = mockRows().filter(f => (!query.type || f.type === query.type) && (!query.regionSlug || f.regionSlug === query.regionSlug || f.regionSlug.startsWith(query.regionSlug + "/")) && (!query.id || f.id === query.id));
  if (!query.id) rows = rows.filter(f => f.businessStatus === "OPEN");
  const terms = (query.search ?? "").trim().split(/\s+/).filter(Boolean);
  rows = rows.filter(f => terms.every(t => [f.name,f.roadAddress,f.city].join(" ").includes(t)));
  if (query.feature) { const key = { "24h":"open24h",night:"nightService",exotic:"exoticService" }[query.feature] as "open24h"; rows = rows.filter(f => f.features[key] === "YES" && f.features.verificationStatus === "VALID"); }
  rows.sort((a,b) => a.name.localeCompare(b.name,"ko"));
  return { facilities: rows.slice((page-1)*size,page*size), total: rows.length, page };
 }
 const sql = getSql(); const feature = query.feature ? featureKeys[query.feature] : null;
 const terms = (query.search ?? "").trim().split(/\s+/).filter(Boolean).slice(0,8);
 const where = sql`f.facility_type IN ('ANIMAL_HOSPITAL','ANIMAL_PHARMACY','PET_FUNERAL')
 AND (${query.id ?? null}::uuid IS NULL OR f.id=${query.id ?? null}::uuid)
 AND (${Boolean(query.id)} OR (f.is_active AND f.business_status='OPEN'))
 AND (${query.type ?? null}::text IS NULL OR f.facility_type::text=${query.type ?? null})
 AND (${query.regionSlug ?? null}::text IS NULL OR r.full_slug=${query.regionSlug ?? null} OR starts_with(r.full_slug, ${(query.regionSlug ?? "") + "/"}))
 AND NOT EXISTS (SELECT 1 FROM unnest(${terms}::text[]) term WHERE strpos(lower(concat_ws(' ', f.name,f.road_address,f.jibun_address,f.province,f.city,f.district,f.legal_dong)), lower(term))=0)
 AND (${feature}::text IS NULL OR EXISTS (SELECT 1 FROM current_facility_verifications v WHERE v.facility_id=f.id AND v.field_name=${feature} AND v.field_value='YES' AND v.expires_at>now() AND v.verified_at<=now() AND (v.source_url IS NOT NULL OR v.evidence_note IS NOT NULL)))`;
 const [count] = await sql`SELECT count(*)::int AS total FROM facilities f LEFT JOIN regions r ON r.id=f.region_id WHERE ${where}`;
 const rows = await sql`SELECT f.*,r.full_slug,
  (SELECT jsonb_agg(jsonb_build_object('fieldName',v.field_name,'fieldValue',v.field_value,'sourceType',v.source_type,'sourceUrl',v.source_url,'evidenceNote',v.evidence_note,'verifiedAt',v.verified_at,'expiresAt',v.expires_at)) FROM current_facility_verifications v WHERE v.facility_id=f.id AND v.field_name IN ('open_24h','night_service','exotic_service','cat_service','parking_available')) AS verification_evidence,
  (SELECT max(verified_at) FROM current_facility_verifications v WHERE v.facility_id=f.id AND v.expires_at>now() AND v.verified_at<=now()) AS verified_at,
  verified.open_24h,verified.night_service,verified.exotic_service,verified.cat_service,verified.parking_available
 FROM facilities f LEFT JOIN regions r ON r.id=f.region_id
 LEFT JOIN LATERAL (
   SELECT
   max(field_value) FILTER(WHERE field_name='open_24h') AS open_24h,
   max(field_value) FILTER(WHERE field_name='night_service') AS night_service,
   max(field_value) FILTER(WHERE field_name='exotic_service') AS exotic_service,
   max(field_value) FILTER(WHERE field_name='cat_service') AS cat_service,
   max(field_value) FILTER(WHERE field_name='parking_available') AS parking_available
   FROM (SELECT DISTINCT ON(field_name) field_name,field_value FROM current_facility_verifications
     WHERE facility_id=f.id AND expires_at>now() AND verified_at<=now()
     AND (source_url IS NOT NULL OR evidence_note IS NOT NULL) ORDER BY field_name,verified_at DESC,created_at DESC) latest
 ) verified ON true
 WHERE ${where}
 ORDER BY ${query.sort === "name" ? sql`f.name ASC` : sql`f.data_quality_score DESC,f.name ASC`}, f.id
 LIMIT ${size} OFFSET ${(page-1)*size}`;
 return { facilities: rows.map(mapFacility), total:Number(count.total), page };
}
export async function listFacilities(type?: FacilityKind) { return (await queryFacilities({ type })).facilities; }
export const getFacility=cache(async(id:string)=>(await queryFacilities({id})).facilities[0]??null);
export async function searchFacilities(query: string) { return (await queryFacilities({ search: query })).facilities; }
export async function listFeeStatistics(itemCode?: string, regionSlug?: string): Promise<FeeStatisticView[]> {
 if (isMockMode()) return mockFeeStatistics.filter(f => (!itemCode || f.itemCode===itemCode) && (!regionSlug || regionSlug==="jeonnam/yeosu" || regionSlug==="jeonnam")).map(f=>({...f,regionSlug:f.regionLevel==="CITY"?"jeonnam/yeosu":f.regionLevel==="PROVINCE"?"jeonnam":undefined}));
 const sql = getSql();
 const rows = await sql`SELECT m.*,r.full_slug FROM medical_fee_statistics m LEFT JOIN regions r ON r.id=m.region_id
 WHERE (${itemCode ?? null}::text IS NULL OR m.item_code=${itemCode ?? null})
 AND (${regionSlug ?? null}::text IS NULL OR r.full_slug=${regionSlug ?? null} OR m.region_level='NATIONAL' OR (m.region_level='PROVINCE' AND r.full_slug=split_part(${regionSlug ?? ""},'/',1)))
 AND m.survey_year=(SELECT max(survey_year) FROM medical_fee_statistics)
 ORDER BY m.item_code,m.region_level,m.animal_type,m.weight_class`;
 return rows.map(r => ({ itemCode:r.item_code,itemName:r.item_name,region:r.region_level==="NATIONAL"?"전국":r.city||r.province,regionLevel:r.region_level,surveyYear:r.survey_year,minimumPrice:r.minimum_price,medianPrice:r.median_price,averagePrice:r.average_price,maximumPrice:r.maximum_price,sampleCount:r.sample_count,sourceName:r.source_name,sourceUrl:r.source_url,sourceDate:r.source_date,regionSlug:r.full_slug,animalType:r.animal_type,weightClass:r.weight_class }));
}
export async function nearbyFacilities(input: { latitude:number;longitude:number;radiusMeters:number;type?:FacilityKind;excludeId?:string;feature?:Feature }) {
 if (isMockMode()) return mockRows().filter(f=>f.id!==input.excludeId && (!input.type||f.type===input.type) && (!input.feature||f.features.open24h==="YES") && f.latitude!=null && f.longitude!=null).map(f=>({...f,distanceMeters:distanceMeters(input,{latitude:f.latitude!,longitude:f.longitude!})})).filter(f=>f.distanceMeters<=input.radiusMeters).sort((a,b)=>a.distanceMeters-b.distanceMeters).slice(0,30);
 const sql = getSql();
 const rows = await sql`SELECT f.*,r.full_slug,ST_Distance(f.location,ST_SetSRID(ST_MakePoint(${input.longitude},${input.latitude}),4326)::geography) AS distance_meters
 FROM facilities f LEFT JOIN regions r ON r.id=f.region_id
 WHERE f.is_active AND f.business_status='OPEN' AND f.geo_status='VALID' AND f.facility_type IN ('ANIMAL_HOSPITAL','ANIMAL_PHARMACY','PET_FUNERAL')
 AND (${input.type??null}::text IS NULL OR f.facility_type::text=${input.type??null})
 AND (${input.excludeId??null}::uuid IS NULL OR f.id<>${input.excludeId??null}::uuid)
 AND (${input.feature??null}::text IS NULL OR EXISTS(SELECT 1 FROM current_facility_verifications v WHERE v.facility_id=f.id AND v.field_name='open_24h' AND v.field_value='YES' AND v.expires_at>now() AND v.verified_at<=now()))
 AND ST_DWithin(f.location,ST_SetSRID(ST_MakePoint(${input.longitude},${input.latitude}),4326)::geography,${input.radiusMeters})
 ORDER BY distance_meters,f.id LIMIT 30`;
 return rows.map(mapFacility);
}
