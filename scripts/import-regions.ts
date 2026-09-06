import "./env";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { getSql, closeSql } from "../src/db/connection";

type Level = "PROVINCE" | "CITY" | "DISTRICT";
type SourceRow = { code:string; fullName:string; active:boolean };
type RegionRow = SourceRow & { level:Level; name:string; shortName:string; slug:string; fullSlug:string; parentCode?:string };

const sourceUrl="https://www.code.go.kr/stdcode/regCodeL.do";
const provinceSlugs:Record<string,string>={11:"seoul",12:"jeonnam-gwangju",26:"busan",27:"daegu",28:"incheon",30:"daejeon",31:"ulsan",36:"sejong",41:"gyeonggi",43:"chungbuk",44:"chungnam",47:"gyeongbuk",48:"gyeongnam",50:"jeju",51:"gangwon",52:"jeonbuk"};
const citySlugs:Record<string,string>={"12130":"yeosu","12150":"suncheon","12190":"gwangyang"};

function decode(bytes:Buffer){
 try{const text=new TextDecoder("utf-8",{fatal:true}).decode(bytes);if(text.includes("법정동코드"))return {text,encoding:"UTF-8"};}catch{}
 const text=new TextDecoder("euc-kr",{fatal:true}).decode(bytes);
 if(!text.includes("법정동코드"))throw new Error("UNRECOGNIZED_ENCODING_OR_HEADER");
 return {text,encoding:"CP949/EUC-KR"};
}
function parse(text:string):SourceRow[]{
 const lines=text.replace(/^\uFEFF/,"").split(/\r?\n/).filter(Boolean);
 const delimiter=lines[0].includes("\t")?"\t":",";
 const header=lines.shift()!.split(delimiter).map(v=>v.trim().replace(/^"|"$/g,""));
 const codeIndex=header.indexOf("법정동코드"),nameIndex=header.indexOf("법정동명"),statusIndex=header.findIndex(v=>["폐지여부","폐지구분"].includes(v));
 if(codeIndex<0||nameIndex<0||statusIndex<0)throw new Error("OFFICIAL_COLUMNS_MISSING");
 return lines.map((line,index)=>{
  const cols=line.split(delimiter).map(v=>v.trim().replace(/^"|"$/g,""));
  const code=cols[codeIndex],fullName=cols[nameIndex],status=cols[statusIndex];
  if(!/^\d{10}$/.test(code)||!fullName||!["존재","폐지","현존"].includes(status))throw new Error(`INVALID_OFFICIAL_ROW_${index+2}`);
  return {code,fullName,active:status!=="폐지"};
 });
}
function shortName(name:string){return name.replace(/특별자치도$|특별자치시$|특별시$|광역시$|통합특별시$|도$|시$|군$|구$/u,"")||name;}
function build(source:SourceRow[]):RegionRow[]{
 const candidates=source.filter(r=>r.code.endsWith("00")).map(r=>{
  const names=r.fullName.split(/\s+/),province=names.length===1;
  const level:Level=province?"PROVINCE":r.code.endsWith("00000")?"CITY":"DISTRICT";
  const name=province?r.fullName:names.at(-1)!;
  return {...r,level,name,shortName:shortName(name)};
 });
 const byCode=new Map(candidates.map(r=>[r.code,r]));
 const provinces=new Map(candidates.filter(r=>r.level==="PROVINCE").map(r=>[r.fullName,r.code]));
 const withParents=candidates.map(r=>{
  if(r.level==="PROVINCE")return {...r,parentCode:undefined};
  if(r.level==="CITY")return {...r,parentCode:provinces.get(r.fullName.split(/\s+/)[0])};
  const structural=`${r.code.slice(0,5)}00000`;
  return {...r,parentCode:byCode.has(structural)?structural:provinces.get(r.fullName.split(/\s+/)[0])};
 });
 const orphan=withParents.filter(r=>r.level!=="PROVINCE"&&!r.parentCode);
 if(orphan.length)throw new Error(`ORPHAN_OFFICIAL_REGIONS_${orphan.length}`);
 const slugged=new Map<string,RegionRow>();
 for(const r of withParents.sort((a,b)=>a.fullName.split(/\s+/).length-b.fullName.split(/\s+/).length||a.code.localeCompare(b.code))){
  const slug=r.level==="PROVINCE"?(provinceSlugs[r.code.slice(0,2)]??`r-${r.code.slice(0,2)}`):r.level==="CITY"?(citySlugs[r.code.slice(0,5)]??`r-${r.code.slice(0,5)}`):`r-${r.code.slice(0,8)}`;
  const parent=r.parentCode?slugged.get(r.parentCode):undefined;
  if(r.parentCode&&!parent)throw new Error(`PARENT_ORDER_FAILURE_${r.code}`);
  slugged.set(r.code,{...r,slug,fullSlug:parent?`${parent.fullSlug}/${slug}`:slug});
 }
 const rows=[...slugged.values()];
 if(new Set(rows.map(r=>r.code)).size!==rows.length||new Set(rows.map(r=>r.fullSlug)).size!==rows.length)throw new Error("DUPLICATE_REGION_KEY");
 return rows;
}
async function main(){
 const arg=process.argv.find(v=>v.startsWith("--file="));
 if(!arg)throw new Error("USE_--file_OFFICIAL_TXT_OR_CSV");
 const file=arg.slice(7);if(!/\.(txt|csv)$/i.test(file))throw new Error("OFFICIAL_FORMAT_MUST_BE_TXT_OR_CSV");
 const bytes=await readFile(file),decoded=decode(bytes),source=parse(decoded.text),rows=build(source);
 const hash=createHash("sha256").update(bytes).digest("hex");
 const sql=getSql();
 try{await sql.begin(async tx=>{
  await tx`SELECT pg_advisory_xact_lock(774203002)`;
  const ids=new Map<string,number>();
  for(const r of rows){
   const parentId:number|null=r.parentCode?(ids.get(r.parentCode)??null):null;
   if(r.parentCode&&parentId===null)throw new Error("ORPHAN_PARENT");
   const [saved]=await tx`INSERT INTO regions(parent_id,level,name,short_name,slug,full_slug,province_code,city_code,official_code,official_full_name,is_active,abolished_at,source_updated_at)
    VALUES(${parentId},${r.level},${r.name},${r.shortName},${r.slug},${r.fullSlug},${r.code.slice(0,2)},${r.level==="PROVINCE"?null:r.code.slice(0,5)},${r.code},${r.fullName},${r.active},${null},now())
    ON CONFLICT(official_code) DO UPDATE SET parent_id=EXCLUDED.parent_id,level=EXCLUDED.level,name=EXCLUDED.name,short_name=EXCLUDED.short_name,slug=EXCLUDED.slug,full_slug=EXCLUDED.full_slug,province_code=EXCLUDED.province_code,city_code=EXCLUDED.city_code,official_full_name=EXCLUDED.official_full_name,is_active=EXCLUDED.is_active,abolished_at=EXCLUDED.abolished_at,source_updated_at=now(),updated_at=now() RETURNING id`;
   ids.set(r.code,saved.id);
  }
  const legacy=[
   ["1200000000","전라남도","jeonnam"],["1200000000","광주광역시","gwangju"],
   ["1213000000","여수시","jeonnam/yeosu"],["1215000000","순천시","jeonnam/suncheon"],["1219000000","광양시","jeonnam/gwangyang"]
  ] as const;
  for(const [code,name,slug] of legacy){const regionId=ids.get(code);if(regionId)await tx`INSERT INTO region_aliases(region_id,alias_name,alias_slug) VALUES(${regionId},${name},${slug}) ON CONFLICT(alias_slug) DO UPDATE SET region_id=EXCLUDED.region_id,alias_name=EXCLUDED.alias_name`;}
  await tx`INSERT INTO admin_audit_logs(admin,action,entity_type,entity_id,after_json) VALUES(${process.env.ADMIN_EMAIL??"region-importer"},'OFFICIAL_REGION_IMPORT','regions',${hash},${tx.json({sourceUrl,fileName:basename(file),encoding:decoded.encoding,sourceRows:source.length,regionRows:rows.length})})`;
 });
 const counts=await sql`SELECT level,count(*)::int AS count FROM regions GROUP BY level ORDER BY level`;
 console.log(JSON.stringify({status:"SUCCESS",encoding:decoded.encoding,sourceRows:source.length,imported:rows.length,counts}));
 }finally{await closeSql();}
}
main().catch(()=>{console.error("Official region import failed. No source rows were partially committed.");process.exitCode=1;});
