import "./env";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { redactSample } from "@/data/adapters/contract";

const sources = [
  {name:"pharmacy",endpoint:"https://apis.data.go.kr/1741000/animal_pharmacies/info"},
  {name:"funeral",endpoint:"https://apis.data.go.kr/1741000/animal_cremation/info"},
] as const;

function arrays(value: unknown, path: string[] = []): Array<{path:string[];value:unknown[]}> {
  if (Array.isArray(value)) return [{path,value}];
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key,item])=>arrays(item,[...path,key]));
}

async function main(){
 const key=process.env.PUBLIC_DATA_SERVICE_KEY;
 if(!key)throw new Error("PUBLIC_DATA_SERVICE_KEY_NOT_CONFIGURED");
 let decoded=key;try{decoded=decodeURIComponent(key);}catch{}
 await mkdir("docs/api-samples",{recursive:true});
 for(const source of sources){
  const url=new URL(source.endpoint);
  url.searchParams.set("serviceKey",decoded);
  url.searchParams.set("pageNo","1");url.searchParams.set("numOfRows","5");url.searchParams.set("returnType","json");
  const response=await fetch(url,{headers:{Accept:"application/json"},redirect:"error",signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error(`${source.name.toUpperCase()}_HTTP_REJECTED`);
  const raw=JSON.parse(await response.text());
  const safe=redactSample(raw,key);
  const text=JSON.stringify(safe,null,2)+"\n";
  await writeFile(`docs/api-samples/${source.name}.json`,text,"utf8");
  const candidates=arrays(safe).map(item=>({path:item.path.join("."),length:item.value.length,keys:item.value[0]&&typeof item.value[0]==="object"?Object.keys(item.value[0] as object):[]}));
  console.log(JSON.stringify({source:source.name,root_keys:Object.keys(safe as object),arrays:candidates,sample_sha256:createHash("sha256").update(text).digest("hex")}));
 }
}
main().catch(error=>{console.error(error instanceof Error?error.message:"INSPECTION_FAILED");process.exitCode=1;});
