import type { FacilityKind } from "@/domain/facility";
import type { FacilitySourceAdapter, FetchParams, NormalizedFacility, RawPage, SourceType, ValidationResult } from "./types";
import { atPath, loadContract, type PublicApiContract } from "./contract";
abstract class MoisAdapter implements FacilitySourceAdapter {
 abstract sourceType:SourceType;abstract facilityType:FacilityKind;
 constructor(private suppliedContract?:PublicApiContract){}
 async contract(){return this.suppliedContract??loadContract(this.sourceType);}
 async fetchRaw(params:FetchParams):Promise<unknown>{
  const c=await this.contract();const key=process.env.PUBLIC_DATA_SERVICE_KEY;
  if(!key)throw new Error("PUBLIC_DATA_SERVICE_KEY_NOT_CONFIGURED");
  if(!Number.isInteger(params.page)||params.page<1||!Number.isInteger(params.pageSize)||params.pageSize<1||params.pageSize>100)throw new Error("INVALID_PAGE");
  const url=new URL(c.endpoint);
  for(const[k,v]of Object.entries(c.request.fixed))url.searchParams.set(k,v);
  url.searchParams.set(c.request.keyParameter,key);
  url.searchParams.set(c.request.pageParameter,String(params.page));
  url.searchParams.set(c.request.sizeParameter,String(params.pageSize));
  for(let attempt=0;attempt<3;attempt++){
   try{
    const response=await fetch(url,{redirect:"error",cache:"no-store",signal:AbortSignal.timeout(15000),headers:{Accept:"application/json"}});
    if(response.status===429||response.status>=500){if(attempt<2){await new Promise(r=>setTimeout(r,500*2**attempt));continue;}throw new Error("API_TEMPORARY_FAILURE");}
    if(!response.ok)throw new Error("API_HTTP_REJECTED");
    const text=await response.text();if(text.length>5000000)throw new Error("API_RESPONSE_TOO_LARGE");
    try{return JSON.parse(text);}catch{throw new Error("API_NON_JSON_RESPONSE");}
   }catch(error){
    if(error instanceof Error&&/^API_/.test(error.message))throw error;
    if(attempt===2)throw new Error("API_NETWORK_FAILURE");
    await new Promise(r=>setTimeout(r,500*2**attempt));
   }
  }
  throw new Error("API_FETCH_FAILED");
 }
 async parse(raw:unknown):Promise<RawPage>{
  const c=await this.contract();if(!c.response)throw new Error("API_RESPONSE_CONTRACT_UNCONFIRMED");
  const code=atPath(raw,c.response.resultCodePath);
  if(!c.response.successCodes.includes(String(code)))throw new Error("API_RESULT_NOT_SUCCESS");
  const items=atPath(raw,c.response.itemsPath),total=atPath(raw,c.response.totalPath);
  if(!Array.isArray(items)||!(typeof total==="number"||typeof total==="string")||String(total).trim()===""||!Number.isSafeInteger(Number(total))||Number(total)<0)throw new Error("API_SCHEMA_CHANGED");
  return {items,totalCount:Number(total),raw};
 }
 async fetchPage(params:FetchParams){return this.parse(await this.fetchRaw(params));}
 async normalize(raw:unknown):Promise<NormalizedFacility>{
  const c=await this.contract();if(!c.mapping)throw new Error("실제 response key mapping 미확정");
  if(!raw||typeof raw!=="object"||Array.isArray(raw))throw new Error("INVALID_RECORD");
  const result:Record<string,string|undefined>={};
  for(const[key,field]of Object.entries(c.mapping.fields)){
   if(field===null){result[key]=undefined;continue;}
   if(!Object.hasOwn(raw,field))throw new Error("MAPPED_FIELD_MISSING");
   const value=(raw as Record<string,unknown>)[field];
   if(value!==null&&typeof value!=="string"&&typeof value!=="number")throw new Error("INVALID_FIELD_TYPE");
   result[key]=value==null?undefined:String(value).trim()||undefined;
  }
  return {...result,sourceType:this.sourceType,facilityType:this.facilityType,externalId:result.externalId??"",name:result.name??"",sourceCrs:c.mapping.sourceCrs,businessStatus:c.mapping.statuses[result[c.mapping.statusField]??""]??"UNKNOWN"} as NormalizedFacility;
 }
 validate(item:NormalizedFacility):ValidationResult{
  const errors:string[]=[];const warnings:string[]=[];
  if(!item.externalId.trim())errors.push("MISSING_ID");if(!item.name.trim())errors.push("MISSING_NAME");
  if(!item.roadAddress&&!item.jibunAddress)warnings.push("MISSING_ADDRESS");
  if(!item.sourceX||!item.sourceY)warnings.push("MISSING_COORDINATES");
  return {valid:!errors.length,errors,warnings};
 }
}
export class MoisHospitalAdapter extends MoisAdapter {sourceType="MOIS_ANIMAL_HOSPITAL" as const;facilityType="ANIMAL_HOSPITAL" as const;}
export class MoisAnimalPharmacyAdapter extends MoisAdapter {sourceType="MOIS_ANIMAL_PHARMACY" as const;facilityType="ANIMAL_PHARMACY" as const;}
export class MoisPetFuneralAdapter extends MoisAdapter {sourceType="MOIS_PET_FUNERAL" as const;facilityType="PET_FUNERAL" as const;}
export const publicAdapters=[new MoisHospitalAdapter(),new MoisAnimalPharmacyAdapter(),new MoisPetFuneralAdapter()];
