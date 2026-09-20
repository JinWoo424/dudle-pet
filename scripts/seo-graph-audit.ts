import "./env";
import {closeSql,getSql} from "@/db/connection";
import {paginationPages} from "@/lib/pagination";

type Row=Record<string,unknown>;
const origin="https://pet.dudle.co.kr";
const kindPath:Record<string,string>={ANIMAL_HOSPITAL:"hospital",ANIMAL_PHARMACY:"pharmacy",PET_FUNERAL:"funeral"};
const pageKind:Record<string,string>={HOSPITAL_REGION:"ANIMAL_HOSPITAL",PHARMACY_REGION:"ANIMAL_PHARMACY",FUNERAL_REGION:"PET_FUNERAL"};
const minimum:Record<string,number>={ANIMAL_HOSPITAL:5,ANIMAL_PHARMACY:5,PET_FUNERAL:2};
const pathOf=(url:string)=>new URL(url,origin).pathname;

async function main(){
 const sql=getSql();
 const [pages,regions,facilities]=await Promise.all([
  sql`SELECT page_type,facility_type,region_id,result_count,page_quality_score,seo_status,manual_hold,canonical_url FROM seo_pages`,
  sql`SELECT id,parent_id,full_slug,hospital_count,pharmacy_count,funeral_count,is_active FROM regions WHERE is_active`,
  sql`SELECT f.id,f.facility_type,f.region_id,f.data_quality_score,f.name,r.full_slug FROM facilities f JOIN regions r ON r.id=f.region_id AND r.is_active WHERE f.is_active AND f.business_status='OPEN' AND f.facility_type IN ('ANIMAL_HOSPITAL','ANIMAL_PHARMACY','PET_FUNERAL')`,
 ]);
 const indexable=new Set(pages.filter(row=>row.seo_status==="SEO_READY"&&!row.manual_hold).map(row=>pathOf(String(row.canonical_url))));
 const nodes=new Set<string>(["/",...pages.map(row=>pathOf(String(row.canonical_url)))]);const edges=new Map<string,Set<string>>();
 const add=(from:string,to:string)=>{nodes.add(from);nodes.add(to);const values=edges.get(from)??new Set<string>();values.add(to);edges.set(from,values);};
 for(const path of ["/hospital","/pharmacy","/funeral","/cost","/guide"])add("/",path);
 for(const path of ["/hospital/seoul","/hospital/busan","/hospital/daegu","/hospital/incheon","/hospital/daejeon","/hospital/ulsan","/hospital/sejong","/hospital/jeju","/hospital/jeonnam-gwangju/yeosu","/hospital/jeonnam-gwangju/suncheon","/cost/seoul","/cost/busan","/pharmacy/seoul","/pharmacy/busan"])add("/",path);
 const regionById=new Map(regions.map(row=>[Number(row.id),row]));
 const regionPage=new Map<string,Row>();
 for(const row of pages){const kind=pageKind[String(row.page_type)];if(kind&&row.region_id)regionPage.set(`${kind}:${row.region_id}`,row);}
 for(const row of pages){const kind=pageKind[String(row.page_type)];if(!kind||!row.region_id)continue;const region=regionById.get(Number(row.region_id));if(!region)continue;const target=pathOf(String(row.canonical_url));const parentId=region.parent_id==null?null:Number(region.parent_id);const parent=parentId?regionPage.get(`${kind}:${parentId}`):null;const source=parent?pathOf(String(parent.canonical_url)):`/${kindPath[kind]}`;const countKey=kind==="ANIMAL_HOSPITAL"?"hospital_count":kind==="ANIMAL_PHARMACY"?"pharmacy_count":"funeral_count";if(Number(region[countKey]??0)>=minimum[kind])add(source,target);}
 const approvedByRegion=new Map<number,Row[]>();
 for(const row of pages){if(!row.region_id||row.seo_status!=="SEO_READY"||row.manual_hold||row.page_type==="FACILITY_DETAIL")continue;const list=approvedByRegion.get(Number(row.region_id))??[];list.push(row);approvedByRegion.set(Number(row.region_id),list);}
 for(const row of pages){if(!row.region_id)continue;const current=pathOf(String(row.canonical_url));for(const sibling of approvedByRegion.get(Number(row.region_id))??[]){const target=pathOf(String(sibling.canonical_url));if(target!==current)add(current,target);}}
 const costRegions=new Map(pages.filter(row=>row.page_type==="COST_REGION"&&row.region_id).map(row=>[Number(row.region_id),pathOf(String(row.canonical_url))]));
 for(const [regionId,target] of costRegions){const region=regionById.get(regionId);const parent=region?.parent_id==null?undefined:costRegions.get(Number(region.parent_id));add(parent??"/cost",target);}
 for(const row of pages){if(row.page_type!=="COST_ITEM"||!row.region_id)continue;const item=pathOf(String(row.canonical_url)),region=costRegions.get(Number(row.region_id));if(region){add(region,item);add(item,region);}}
 const listings=new Map<string,Row[]>();
 for(const facility of facilities){const kind=String(facility.facility_type),segments=String(facility.full_slug).split("/");for(let length=1;length<=segments.length;length++){const key=`/${kindPath[kind]}/${segments.slice(0,length).join("/")}`;const rows=listings.get(key)??[];rows.push(facility);listings.set(key,rows);}const root=`/${kindPath[kind]}`;const roots=listings.get(root)??[];roots.push(facility);listings.set(root,roots);}
 const detailPaths=indexable.size?new Set([...indexable].filter(path=>/[0-9a-f-]{36}$/.test(path))):new Set<string>();
 for(const [listing,rows] of listings){rows.sort((a,b)=>Number(b.data_quality_score)-Number(a.data_quality_score)||String(a.name).localeCompare(String(b.name),"ko")||String(a.id).localeCompare(String(b.id)));const totalPages=Math.max(1,Math.ceil(rows.length/30));for(let page=1;page<=totalPages;page++){const pagePath=page===1?listing:`${listing}?page=${page}&sort=quality`;for(const number of paginationPages(page,rows.length,30)){if(number!==page)add(pagePath,number===1?listing:`${listing}?page=${number}&sort=quality`);}if(page>1)add(pagePath,page===2?listing:`${listing}?page=${page-1}&sort=quality`);if(page<totalPages)add(pagePath,`${listing}?page=${page+1}&sort=quality`);for(const facility of rows.slice((page-1)*30,page*30)){const detail=`/${kindPath[String(facility.facility_type)]}/${facility.full_slug}/${facility.id}`;if(detailPaths.has(detail))add(pagePath,detail);}}
 }
 for(const detail of detailPaths){const listing=detail.replace(/\/[0-9a-f-]{36}$/,'');add(detail,listing);}
 const distances=new Map<string,number>([["/",0]]),queue=["/"];for(let index=0;index<queue.length;index++){const from=queue[index],next=(distances.get(from)??0)+1;for(const to of edges.get(from)??[]){if(!distances.has(to)){distances.set(to,next);queue.push(to);}}}
 const inbound=new Map<string,number>();for(const targets of edges.values())for(const target of targets)inbound.set(target,(inbound.get(target)??0)+1);
 const values=[...indexable];const depth={"0-2":0,"3":0,"4":0,"5+":0,unreachable:0};for(const path of values){const value=distances.get(path);if(value==null)depth.unreachable++;else if(value<=2)depth["0-2"]++;else if(value===3)depth["3"]++;else if(value===4)depth["4"]++;else depth["5+"]++;}
 const inboundBuckets={zero:0,one:0,"2-5":0,"6+":0};for(const path of values){const value=inbound.get(path)??0;if(value===0)inboundBuckets.zero++;else if(value===1)inboundBuckets.one++;else if(value<=5)inboundBuckets["2-5"]++;else inboundBuckets["6+"]++;}
 const tierA=new Set(pages.filter(row=>row.seo_status==="SEO_READY"&&!row.manual_hold&&((row.page_type==="FACILITY_DETAIL"&&Number(row.page_quality_score)>=80)||(row.page_type==="HOSPITAL_REGION"&&Number(row.page_quality_score)>=70&&Number(row.result_count)>=20)||(row.page_type==="PHARMACY_REGION"&&Number(row.page_quality_score)>=70&&Number(row.result_count)>=30)||(row.page_type==="FUNERAL_REGION"&&Number(row.page_quality_score)>=70&&Number(row.result_count)>=3)||(String(row.page_type).startsWith("COST_")&&Number(row.page_quality_score)>=70&&Number(row.result_count)>0))).map(row=>pathOf(String(row.canonical_url))));
 const tierAOrphans=[...tierA].filter(path=>(inbound.get(path)??0)===0);const tierADeep=[...tierA].filter(path=>(distances.get(path)??Infinity)>=4);
 console.log(JSON.stringify({generatedAt:new Date().toISOString(),method:"DB + route inventory + rendered link rules; sitemap discovery excluded",indexableNodes:indexable.size,graphNodes:nodes.size,edges:[...edges.values()].reduce((sum,set)=>sum+set.size,0),orphan:indexable.size?inboundBuckets.zero:0,inbound:inboundBuckets,depth,tierAOrphanCount:tierAOrphans.length,tierAOrphanExamples:tierAOrphans.slice(0,20),tierADepth4PlusCount:tierADeep.length,tierADepth4PlusExamples:tierADeep.slice(0,20)},null,2));
}
main().catch(error=>{console.error(error instanceof Error?error.message:"SEO_GRAPH_AUDIT_FAILED");process.exitCode=1;}).finally(closeSql);
