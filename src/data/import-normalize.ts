import { createHash } from "node:crypto";
import { normalizeAddress, normalizeName, normalizePhone } from "@/lib/normalizers";
import type { RegionView } from "@/lib/regions";
import type { NormalizedFacility } from "./adapters/types";
export function mapRegion(address:string,regions:RegionView[]){
 const terms=normalizeAddress(address).split(" ");
 const province=regions.find(r=>r.level==="PROVINCE"&&[r.name,r.shortName,normalizeAddress(r.name)].includes(terms[0]));
 if(!province)return {status:"UNMATCHED" as const};
 const city=regions.find(r=>r.parentId===province.id&&[r.name,r.shortName].includes(terms[1]));
 if(!city)return {status:"REVIEW_REQUIRED" as const,province:province.name};
 const district=regions.find(r=>r.parentId===city.id&&[r.name,r.shortName].includes(terms[2]));
 return {status:"MATCHED" as const,regionId:district?.id??city.id,province:province.name,city:city.name,district:district?.name};
}
export function dateOnly(value?:string){
 if(!value)return null;
 const iso=/^\d{8}$/.test(value)?`${value.slice(0,4)}-${value.slice(4,6)}-${value.slice(6,8)}`:value;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(iso)||!Number.isFinite(Date.parse(iso))||new Date(iso).toISOString().slice(0,10)!==iso)throw new Error("INVALID_SOURCE_DATE");
 return iso;
}
export function sourceTimestamp(value:string|undefined,format:string){
 if(!value)return null;
 let iso=value;
 if(format==="YYYYMMDDHHmmss_KST"){
  if(!/^\d{14}$/.test(value))throw new Error("INVALID_SOURCE_TIMESTAMP");
  iso=`${value.slice(0,4)}-${value.slice(4,6)}-${value.slice(6,8)}T${value.slice(8,10)}:${value.slice(10,12)}:${value.slice(12,14)}+09:00`;
 }else if(format==="YYYY-MM-DD HH:mm:ss_KST"){
  if(!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value))throw new Error("INVALID_SOURCE_TIMESTAMP");
  iso=value.replace(" ","T")+"+09:00";
 }else if(!/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value))throw new Error("TIMEZONE_REQUIRED");
 if(!Number.isFinite(Date.parse(iso)))throw new Error("INVALID_SOURCE_TIMESTAMP");
 return new Date(iso);
}
export function normalizeImport(item:NormalizedFacility,regions:RegionView[],dateFormat:string){
 const region=mapRegion(item.roadAddress||item.jibunAddress||"",regions);
 const geo:{latitude?:number;longitude?:number;status:"VALID"|"MISSING"|"INVALID"|"REVIEW_REQUIRED"}={status:"MISSING"};
 if(item.sourceX&&item.sourceY){
  // Production coordinates are resolved with PostGIS/PROJ's EPSG registry by
  // syncSource after raw persistence. Never publish an approximate JS conversion.
  geo.status=Number.isFinite(Number(item.sourceX))&&Number.isFinite(Number(item.sourceY))?"REVIEW_REQUIRED":"INVALID";
 }
 const phone=normalizePhone(item.phone);
 return {
 public_source:item.sourceType,public_source_id:item.externalId,facility_type:item.facilityType,
 public_local_code:item.publicLocalCode??null,name:item.name,normalized_name:normalizeName(item.name),
 phone_raw:item.phone??null,phone_normalized:phone,road_address:item.roadAddress??null,jibun_address:item.jibunAddress??null,postal_code:item.postalCode??null,
 region_id:region.status==="MATCHED"?region.regionId:null,province:"province" in region?region.province:null,city:"city" in region?region.city:null,district:"district" in region?region.district??null:null,
 public_status_code:item.publicStatusCode??null,public_status_name:item.publicStatusName??null,public_detail_status_code:item.publicDetailStatusCode??null,public_detail_status_name:item.publicDetailStatusName??null,
 business_status:item.businessStatus??"UNKNOWN",license_date:dateOnly(item.licenseDate),license_cancel_date:dateOnly(item.licenseCancelDate),closed_date:dateOnly(item.closedDate),temporary_close_start:dateOnly(item.temporaryCloseStart),temporary_close_end:dateOnly(item.temporaryCloseEnd),reopen_date:dateOnly(item.reopenDate),
 source_x:item.sourceX??null,source_y:item.sourceY??null,source_crs:item.sourceCrs,
 latitude:geo.status==="VALID"?geo.latitude:null,longitude:geo.status==="VALID"?geo.longitude:null,geo_status:geo.status,region_status:region.status,
 source_updated_at:sourceTimestamp(item.sourceUpdatedAt,dateFormat),
 data_quality_score:20+(item.roadAddress||item.jibunAddress?20:0)+(phone?15:0)+(region.status==="MATCHED"?15:0)+(geo.status==="VALID"?20:0)+(item.sourceUpdatedAt?10:0)
 };
}
export function checksum(value:unknown){return createHash("sha256").update(JSON.stringify(value)).digest("hex");}
export function duplicateCandidate(a:{normalized_name:string;road_address:string|null;jibun_address:string|null;phone_normalized:string|null;latitude?:number|null;longitude?:number|null},b:typeof a){
 const aa=normalizeAddress(a.road_address||a.jibun_address||""),ba=normalizeAddress(b.road_address||b.jibun_address||"");
 if(aa&&aa===ba&&a.normalized_name===b.normalized_name)return "NAME_ADDRESS";
 if(aa&&aa===ba&&a.phone_normalized&&a.phone_normalized===b.phone_normalized)return "PHONE_ADDRESS";
 if(a.normalized_name===b.normalized_name&&a.latitude!=null&&a.longitude!=null&&a.latitude===b.latitude&&a.longitude===b.longitude)return "NAME_COORDINATES";
 return null;
}
