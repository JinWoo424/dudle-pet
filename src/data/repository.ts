import type { FacilityKind, FacilityView, FeeStatisticView } from "@/domain/facility";
import { getSql } from "@/db/connection";
import { dataMode } from "@/lib/data-mode";
import { developmentRegions, type RegionView, type Feature, featureKeys } from "@/lib/regions";
import { mockFacilities, mockFeeStatistics } from "./mock";
import { distanceMeters } from "@/lib/geo";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { measuredStage } from "@/lib/preview-server-timing";

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
 const rows = await getSql()`WITH duplicate_names AS MATERIALIZED (SELECT short_name,count(*)::int AS duplicate_short_count FROM regions WHERE is_active AND level IN ('PROVINCE','CITY') GROUP BY short_name) SELECT r.id,r.parent_id,r.level,r.name,r.short_name,r.full_slug,r.hospital_count,r.pharmacy_count,r.funeral_count,p.short_name AS parent_short_name,coalesce(d.duplicate_short_count,0) AS duplicate_short_count,coalesce(array_agg(a.alias_name) FILTER(WHERE a.alias_name IS NOT NULL),'{}') AS aliases,coalesce(array_agg(a.alias_slug) FILTER(WHERE a.alias_slug IS NOT NULL),'{}') AS alias_slugs FROM regions r LEFT JOIN regions p ON p.id=r.parent_id LEFT JOIN duplicate_names d ON d.short_name=r.short_name LEFT JOIN region_aliases a ON a.region_id=r.id WHERE r.is_active GROUP BY r.id,p.short_name,d.duplicate_short_count ORDER BY r.full_slug`;
 return rows.map(r => {const natural=r.level==="PROVINCE"?r.short_name:r.level==="CITY"&&!/[구군]$/.test(r.name)?r.short_name:r.name;const seoName=Number(r.duplicate_short_count)>1&&r.parent_short_name?(r.parent_short_name===natural?r.name:`${r.parent_short_name} ${natural}`):natural;return { id:r.id, parentId:r.parent_id ?? undefined, level:r.level, name:r.name, shortName:r.short_name, seoName, fullSlug:r.full_slug, aliases:r.aliases, aliasSlugs:r.alias_slugs, hospitalCount:Number(r.hospital_count??0), pharmacyCount:Number(r.pharmacy_count??0), funeralCount:Number(r.funeral_count??0) };});
 },["region-registry-v3"],{revalidate:3600,tags:["regions"]});
export async function listRegions():Promise<RegionView[]>{return isMockMode()?developmentRegions:databaseRegions();}
export async function resolveRegion(slug: string) { return (await listRegions()).find(r => r.fullSlug === slug || r.aliasSlugs?.includes(slug)) ?? null; }
export async function queryFacilities(query: FacilityQuery = {}) {
 const page = Number.isFinite(query.page) ? Math.max(1, Math.min(10000, Math.floor(query.page!))) : 1; const size = 30;
 if (isMockMode()) {
  let rows = mockRows().filter(f => (!query.type || f.type === query.type) && (!query.regionSlug || f.regionSlug === query.regionSlug || f.regionSlug.startsWith(query.regionSlug + "/")) && (!query.id || f.id === query.id));
  if (!query.id) rows = rows.filter(f => f.businessStatus === "OPEN");
  const terms = (query.search ?? "").trim().split(/\s+/).filter(Boolean);
  rows = rows.filter(f => terms.every(t => [f.name,f.roadAddress,f.city].join(" ").includes(t)));
  if (query.feature) { const key = { "24h":"open24h",night:"nightService",exotic:"exoticService" }[query.feature] as "open24h"; rows = rows.filter(f => f.features[key] === "YES" && f.features.verificationStatus === "VALID"); }
  rows.sort((a,b) => a.name.localeCompare(b.name,"ko"));
  const visible=rows.slice((page-1)*size,page*size);return { facilities:visible,total:rows.length,page,stats:{total:rows.length,coordinateCount:rows.filter(f=>f.latitude!=null&&f.longitude!=null).length,phoneCount:rows.filter(f=>Boolean(f.phone)).length,addressCount:rows.filter(f=>Boolean(f.roadAddress)).length,averageQuality:100,sourceDate:rows.map(f=>f.sourceDate).filter(Boolean).sort().at(-1),syncedAt:rows.map(f=>f.syncedAt).filter(Boolean).sort().at(-1)} };
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
 const [count] = await measuredStage("facilities.count",()=>sql`SELECT count(*)::int AS total,count(*) FILTER(WHERE f.geo_status='VALID' AND f.location IS NOT NULL)::int AS coordinate_count,count(*) FILTER(WHERE f.phone_normalized IS NOT NULL)::int AS phone_count,count(*) FILTER(WHERE nullif(coalesce(f.road_address,f.jibun_address),'') IS NOT NULL)::int AS address_count,coalesce(avg(f.data_quality_score),0)::int AS average_quality,max(f.source_updated_at) AS source_date,max(f.last_synced_at) AS synced_at FROM facilities f LEFT JOIN regions r ON r.id=f.region_id WHERE ${where}`);
 const rows = await measuredStage("facilities.rows",()=>sql`SELECT f.*,r.full_slug,
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
 LIMIT ${size} OFFSET ${(page-1)*size}`);
 const date=(value:unknown)=>value?new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Seoul"}).format(new Date(String(value))):undefined;
 return { facilities:rows.map(mapFacility),total:Number(count.total),page,stats:{total:Number(count.total),coordinateCount:Number(count.coordinate_count),phoneCount:Number(count.phone_count),addressCount:Number(count.address_count),averageQuality:Number(count.average_quality),sourceDate:date(count.source_date),syncedAt:date(count.synced_at)} };
}
export async function listFacilities(type?: FacilityKind) { return (await queryFacilities({ type })).facilities; }
export const getFacility=cache(async(id:string)=>(await queryFacilities({id})).facilities[0]??null);
export async function searchFacilities(query: string) { return (await queryFacilities({ search: query })).facilities; }
export async function listFeeStatistics(itemCode?: string, regionSlug?: string,filters:{animalType?:string;weightClass?:string;surveyYear?:number}={}): Promise<FeeStatisticView[]> {
 if (isMockMode()) return mockFeeStatistics.filter(f => (!itemCode || f.itemCode===itemCode) && (!regionSlug || regionSlug==="jeonnam/yeosu" || regionSlug==="jeonnam")&&(!filters.animalType||f.animalType===filters.animalType)&&(!filters.weightClass||f.weightClass===filters.weightClass)).map(f=>({...f,regionSlug:f.regionLevel==="CITY"?"jeonnam/yeosu":f.regionLevel==="PROVINCE"?"jeonnam":undefined}));
 const sql = getSql();let rows:Row[];
 if(!regionSlug&&!itemCode){
  rows=await sql`WITH active_batch AS (SELECT id,imported_at FROM fee_import_batches WHERE status='SUCCESS' AND (${filters.surveyYear??null}::int IS NULL OR survey_year=${filters.surveyYear??null}) ORDER BY survey_year DESC,imported_at DESC LIMIT 1)
   SELECT DISTINCT ON(m.item_code,m.animal_type,m.weight_class) m.*,r.full_slug,b.imported_at AS collected_at FROM medical_fee_statistics m JOIN active_batch b ON b.id=m.import_batch_id LEFT JOIN regions r ON r.id=m.current_region_id
   WHERE m.region_level='NATIONAL' AND (${filters.animalType??null}::text IS NULL OR m.animal_type::text=${filters.animalType??null}) AND (${filters.weightClass??null}::text IS NULL OR m.weight_class::text=${filters.weightClass??null})
   ORDER BY m.item_code,m.animal_type,m.weight_class,CASE m.region_level WHEN 'NATIONAL' THEN 0 WHEN 'PROVINCE' THEN 1 ELSE 2 END`;
 }else{
  rows=await sql`WITH active_batch AS (SELECT id,imported_at FROM fee_import_batches WHERE status='SUCCESS' AND (${filters.surveyYear??null}::int IS NULL OR survey_year=${filters.surveyYear??null}) ORDER BY survey_year DESC,imported_at DESC LIMIT 1),target AS (SELECT id FROM regions WHERE full_slug=${regionSlug??""} AND is_active),survey_context AS (
    SELECT DISTINCT m.survey_province_name FROM medical_fee_statistics m JOIN active_batch b ON b.id=m.import_batch_id JOIN target t ON t.id=m.current_region_id WHERE m.region_level='CITY'
   ) SELECT m.*,r.full_slug,b.imported_at AS collected_at FROM medical_fee_statistics m JOIN active_batch b ON b.id=m.import_batch_id LEFT JOIN regions r ON r.id=m.current_region_id
   WHERE (${itemCode??null}::text IS NULL OR m.item_code=${itemCode??null})
   AND (${filters.animalType??null}::text IS NULL OR m.animal_type::text=${filters.animalType??null}) AND (${filters.weightClass??null}::text IS NULL OR m.weight_class::text=${filters.weightClass??null})
   AND (m.current_region_id=(SELECT id FROM target) OR (${!regionSlug} AND m.region_level='NATIONAL') OR (${Boolean(itemCode&&regionSlug)} AND EXISTS(SELECT 1 FROM medical_fee_statistics own JOIN active_batch ob ON ob.id=own.import_batch_id WHERE own.current_region_id=(SELECT id FROM target) AND own.item_code=${itemCode??null}) AND (m.region_level='NATIONAL' OR (m.region_level='PROVINCE' AND m.survey_province_name IN(SELECT survey_province_name FROM survey_context)))))
   ORDER BY m.item_code,CASE m.region_level WHEN 'CITY' THEN 0 WHEN 'PROVINCE' THEN 1 ELSE 2 END,m.animal_type,m.weight_class`;
 }
 return rows.map(r => ({ categoryCode:String(r.category_code),itemCode:String(r.item_code),itemName:String(r.item_name),region:r.region_level==="NATIONAL"?"전국":String(r.survey_city_name||r.survey_province_name||"조사 지역"),regionLevel:r.region_level as FeeStatisticView["regionLevel"],surveyYear:Number(r.survey_year),minimumPrice:r.minimum_price==null?null:Number(r.minimum_price),medianPrice:r.median_price==null?null:Number(r.median_price),averagePrice:r.average_price==null?null:Number(r.average_price),maximumPrice:r.maximum_price==null?null:Number(r.maximum_price),sampleCount:r.sample_count==null?null:Number(r.sample_count),sourceName:String(r.source_name),sourceUrl:r.source_url?String(r.source_url):undefined,sourceDate:r.source_date?new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Seoul"}).format(new Date(String(r.source_date))):undefined,collectedAt:r.collected_at?String(r.collected_at):undefined,regionSlug:r.full_slug?String(r.full_slug):undefined,surveyRegionCode:r.survey_region_code?String(r.survey_region_code):undefined,surveyProvinceName:r.survey_province_name?String(r.survey_province_name):undefined,surveyCityName:r.survey_city_name?String(r.survey_city_name):undefined,regionMatchStatus:r.region_match_status as FeeStatisticView["regionMatchStatus"],animalType:String(r.animal_type),weightClass:String(r.weight_class) }));
}
export async function listFeeYears(){
 if(isMockMode())return [];
 const rows=await getSql()`SELECT DISTINCT survey_year FROM fee_import_batches WHERE status='SUCCESS' ORDER BY survey_year DESC`;
 return rows.map(row=>Number(row.survey_year));
}
export async function listFeeRegionLinks(regionSlug:string,surveyYear?:number){
 if(isMockMode())return [];
 const rows=await getSql()`WITH active_batch AS (SELECT id FROM fee_import_batches WHERE status='SUCCESS' AND (${surveyYear??null}::int IS NULL OR survey_year=${surveyYear??null}) ORDER BY survey_year DESC,imported_at DESC LIMIT 1)
  SELECT r.full_slug,r.name,count(*)::int AS count,max(m.survey_year)::int AS survey_year,min(m.survey_province_name) AS survey_province_name
  FROM medical_fee_statistics m JOIN active_batch b ON b.id=m.import_batch_id JOIN regions r ON r.id=m.current_region_id WHERE r.is_active AND (${regionSlug}='' OR r.full_slug=${regionSlug} OR starts_with(r.full_slug,${regionSlug}||'/'))
  GROUP BY r.id ORDER BY r.full_slug`;
 return rows.map(row=>({slug:String(row.full_slug),name:String(row.name),count:Number(row.count),surveyYear:Number(row.survey_year),surveyProvinceName:String(row.survey_province_name??"")}));
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
