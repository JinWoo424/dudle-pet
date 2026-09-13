import "./env";
import { mkdir, writeFile } from "node:fs/promises";
import { getSql, closeSql } from "../src/db/connection";
import { buildRegionalJourney, type RegionalPageCandidate } from "../src/lib/regional-journey";
import { costRegionSlug } from "../src/data/fee-catalog";

const origin="https://pet.dudle.co.kr";
const types=["HOSPITAL_REGION","PHARMACY_REGION","FUNERAL_REGION","COST_REGION","HOSPITAL_24H","HOSPITAL_NIGHT","HOSPITAL_EXOTIC","COST_ITEM"];
type Page=RegionalPageCandidate & {seo_status:string;manual_hold:boolean;is_active:boolean|null;region_id:number|null};
async function main(){
 const sql=getSql();
 // Read-only: no refresh, migrations, imports, or credential-bearing output.
 const pages=await sql<Page[]>`SELECT s.canonical_url,s.page_type,s.seo_status,s.manual_hold,s.region_id,r.is_active,r.full_slug AS region_slug,r.name AS region_name FROM seo_pages s LEFT JOIN regions r ON r.id=s.region_id ORDER BY s.canonical_url`;
 const regions=await sql<{full_slug:string;name:string}[]>`SELECT full_slug,name FROM regions WHERE is_active ORDER BY full_slug`;
 const ready=pages.filter(p=>p.seo_status==="SEO_READY"&&!p.manual_hold&&(p.region_id===null||p.is_active));
 const candidates=ready.filter(p=>p.region_slug&&types.includes(p.page_type));
 const readyUrls=new Set(ready.map(p=>p.canonical_url));
 const canonicalIssues=ready.filter(p=>{try{const u=new URL(p.canonical_url);return u.origin!==origin||Boolean(u.search||u.hash||u.username||u.password);}catch{return true;}});
 const categoryPrefixes:Record<string,string>={HOSPITAL_REGION:"hospital",PHARMACY_REGION:"pharmacy",FUNERAL_REGION:"funeral",COST_REGION:"cost",HOSPITAL_24H:"hospital",HOSPITAL_NIGHT:"hospital",HOSPITAL_EXOTIC:"hospital",COST_ITEM:"cost"};
 const routeIssues=candidates.filter(p=>{
  const prefix=categoryPrefixes[p.page_type];const region=p.page_type.startsWith("COST")?costRegionSlug(p.region_slug):p.region_slug;
  const tail=p.page_type==="COST_ITEM"?'/'+new URL(p.canonical_url).pathname.split('/').at(-1):p.page_type==="HOSPITAL_24H"?'/24h':p.page_type==="HOSPITAL_NIGHT"?'/night':p.page_type==="HOSPITAL_EXOTIC"?'/exotic':'';
  return p.canonical_url!==`${origin}/${prefix}/${region}${tail}`;
 });
 let oldCostMonopoly=0,newDuplicatePaths=0,newDuplicateLabels=0,newUnapprovedTargets=0;
 const summaries=regions.map(region=>{
  const own=candidates.filter(p=>p.region_slug===region.full_slug);
  const old=own.slice(0,8);
  if(old.length===8&&old.every(p=>p.page_type.startsWith("COST")))oldCostMonopoly++;
  const links=buildRegionalJourney(candidates,region.full_slug,"",origin);
  newDuplicatePaths+=links.length-new Set(links.map(l=>l.path)).size;
  newDuplicateLabels+=links.length-new Set(links.map(l=>l.regionName+' '+l.label)).size;
  newUnapprovedTargets+=links.filter(l=>!readyUrls.has(origin+l.path)).length;
  return {slug:region.full_slug,ownApprovedPages:own.length,links};
 });
 const groups=(values:string[])=>{const counts=new Map<string,number>();for(const value of values)counts.set(value,(counts.get(value)??0)+1);return [...counts].filter(([,n])=>n>1).map(([value,count])=>({value,count}));};
 const report={generatedAt:new Date().toISOString(),readOnly:true,seoRows:pages.length,readyUrls:ready.length,readyByType:Object.fromEntries([...new Set(ready.map(p=>p.page_type))].map(t=>[t,ready.filter(p=>p.page_type===t).length])),activeRegions:regions.length,regionsWithOwnPages:summaries.filter(s=>s.ownApprovedPages>0).length,oldCostMonopoly,newDuplicatePaths,newDuplicateLabels,newUnapprovedTargets,canonicalIssues:canonicalIssues.map(p=>p.canonical_url),routeIssues:routeIssues.map(p=>p.canonical_url),duplicateCanonicalUrls:groups(ready.map(p=>p.canonical_url)),orphanStatus:"NOT_MEASURED_FULL_RENDERED_GRAPH",scope:"All active DB regions and approved journey candidates. Database graph, not a claim of every live HTML page or search-engine index coverage.",regions:summaries};
 await mkdir("docs/reports",{recursive:true});
 await writeFile("docs/reports/regional-journey-audit.json",JSON.stringify({...report,regions:summaries.filter(s=>s.ownApprovedPages>0)},null,2)+"\n");
 console.log(JSON.stringify({...report,regions:undefined}));
 if(canonicalIssues.length||routeIssues.length||newDuplicatePaths||newDuplicateLabels||newUnapprovedTargets)process.exitCode=1;
}
main().catch(()=>{console.error("REGIONAL_AUDIT_FAILED: details withheld; no DB writes performed");process.exitCode=1;}).finally(closeSql);
