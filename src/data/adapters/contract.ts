import { readFile } from "node:fs/promises";
import { z } from "zod";
export const sourceFiles={MOIS_ANIMAL_HOSPITAL:"hospital",MOIS_ANIMAL_PHARMACY:"pharmacy",MOIS_PET_FUNERAL:"funeral"} as const;
export const mappedFields=["externalId","name","phone","roadAddress","jibunAddress","postalCode","publicLocalCode","publicStatusCode","publicStatusName","publicDetailStatusCode","publicDetailStatusName","licenseDate","licenseCancelDate","closedDate","temporaryCloseStart","temporaryCloseEnd","reopenDate","sourceUpdatedAt","sourceX","sourceY"] as const;
const path=z.array(z.string().min(1)).min(1);
export const contractSchema=z.object({
 officialDocumentUrl:z.url().refine(s=>["data.go.kr","www.data.go.kr","mois.go.kr","www.mois.go.kr"].includes(new URL(s).hostname)),
 verifiedAt:z.iso.date(),
 endpoint:z.url().refine(s=>{const u=new URL(s);return u.protocol==="https:"&&u.hostname==="apis.data.go.kr"&&!u.username&&!u.password&&!u.search&&!u.hash;}),
 request:z.object({keyParameter:z.string().min(1),pageParameter:z.string().min(1),sizeParameter:z.string().min(1),fixed:z.record(z.string(),z.string())}),
 response:z.object({itemsPath:path,totalPath:path,resultCodePath:path,successCodes:z.array(z.string()).min(1)}).optional(),
 mapping:z.object({
  sampleSha256:z.string().regex(/^[a-f0-9]{64}$/),
  fields:z.record(z.enum(mappedFields),z.string().min(1).nullable()),
  statusField:z.enum(["publicStatusCode","publicStatusName","publicDetailStatusCode","publicDetailStatusName"]),
  statuses:z.record(z.string(),z.enum(["OPEN","CLOSED","TEMP_CLOSED","SUSPENDED","UNKNOWN"])),
  sourceCrs:z.literal("EPSG:5174"),
  coordinateOrder:z.enum(["EASTING_NORTHING","NORTHING_EASTING"]),
  sourceDateFormat:z.enum(["ISO_OFFSET","YYYYMMDDHHmmss_KST","YYYY-MM-DD HH:mm:ss_KST"])
 }).optional()
}).superRefine((c,ctx)=>{
 const names=[c.request.keyParameter,c.request.pageParameter,c.request.sizeParameter];
 if(new Set(names).size!==3||names.some(n=>n in c.request.fixed))ctx.addIssue({code:"custom",message:"Request parameter names collide"});
 if(Object.keys(c.request.fixed).some(n=>/key|token|auth|password|secret/i.test(n)))ctx.addIssue({code:"custom",message:"Secrets must not be stored in contract files"});
 if(c.mapping&&(!c.mapping.fields.externalId||!c.mapping.fields.name))ctx.addIssue({code:"custom",message:"ID and name field mappings are required"});
});
export type PublicApiContract=z.infer<typeof contractSchema>;
export async function loadContract(source:keyof typeof sourceFiles){
 try{return contractSchema.parse(JSON.parse(await readFile(`config/public-api/${sourceFiles[source]}.json`,"utf8")));}
 catch{throw new Error("API_CONTRACT_UNCONFIRMED: 공식 문서와 실제 response key를 확인한 계약 파일이 필요합니다.");}
}
export function atPath(raw:unknown,path:string[]):unknown {
 return path.reduce<unknown>((value,key)=>value&&typeof value==="object"&&Object.hasOwn(value,key)?(value as Record<string,unknown>)[key]:undefined,raw);
}
export function redactSample(value:unknown,secret:string):unknown {
 if(typeof value==="string")return secret?value.split(secret).join("[REDACTED]"):value;
 if(Array.isArray(value))return value.map(v=>redactSample(v,secret));
 if(value&&typeof value==="object")return Object.fromEntries(Object.entries(value).map(([key,v])=>[key,/key|authorization|token|password|secret/i.test(key)?"[REDACTED]":redactSample(v,secret)]));
 return value;
}
