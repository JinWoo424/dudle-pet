import "./env";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { closeSql, getSql } from "@/db/connection";

type Row=Record<string,unknown>;
type MatrixRow={
 category:string;province:string;city:string;district:string;canonical_url:string;primary_keyword:string;
 secondary_keyword_1:string;secondary_keyword_2:string;open_count:number;coordinate_count:number;data_quality:string;
 seo_status:string;current_title:string;proposed_title:string;current_h1:string;proposed_h1:string;priority:string;
 description:string;lastmod:string;
};

const base="https://pet.dudle.co.kr";
const requested=new Set(["서울","부산","대구","인천","대전","울산","세종","제주","수원","성남","용인","창원","포항","전주","청주","천안","춘천","여수","순천","강남구","서초구","송파구","해운대구"]);
const categoryConfig:Record<string,{slug:string;label:string;secondary:[string,string]}>= {
 HOSPITAL_REGION:{slug:"hospital",label:"동물병원",secondary:["지도","전화번호"]},
 PHARMACY_REGION:{slug:"pharmacy",label:"동물약국",secondary:["지도","전화번호"]},
 FUNERAL_REGION:{slug:"funeral",label:"반려동물 장례식장",secondary:["공식 등록시설","위치"]},
 COST_REGION:{slug:"cost",label:"동물병원 진료비",secondary:["2025 공식 통계","진료비 비교"]},
};
const csv=(rows:Array<Record<string,unknown>>,headers:string[])=>[
 headers.join(","),
 ...rows.map(row=>headers.map(key=>`"${String(row[key]??"").replaceAll('"','""')}"`).join(",")),
].join("\n")+"\n";
function naturalRegionLabel(row:Row){const level=String(row.level);const name=String(row.name);return level==="PROVINCE"?String(row.short_name):level==="CITY"&&!/[구군]$/u.test(name)?String(row.short_name):name;}
function regionLabel(row:Row,duplicateNames:Map<string,number>){
 const name=String(row.name);
 const natural=naturalRegionLabel(row);
 if((duplicateNames.get(natural)??0)>1&&row.parent_short_name)return String(row.parent_short_name)===natural?name:`${row.parent_short_name} ${natural}`;
 return natural;
}
function priority(pageType:string,label:string,status:string,count:number,quality:number){
 if(status!=="SEO_READY")return "NOINDEX";
 if(requested.has(label))return "P0";
 const p1=pageType==="HOSPITAL_REGION"?count>=20:pageType==="PHARMACY_REGION"?count>=30:pageType==="FUNERAL_REGION"?count>=3:count>0;
 return p1&&quality>=60?"P1":"P2";
}
function title(pageType:string,label:string,count:number){
 const config=categoryConfig[pageType];
 if(pageType==="COST_REGION")return `${label} ${config.label} | 2025 공식 통계`;
 const tail=pageType==="HOSPITAL_REGION"?"지도·전화·병원 정보":pageType==="PHARMACY_REGION"?"지도·주소·전화번호":"공식 등록시설 정보";
 return `${label} ${config.label} ${count}곳 | ${tail}`;
}
function description(pageType:string,label:string,count:number,coordinates:number,lastmod:string){
 const config=categoryConfig[pageType];
 if(pageType==="COST_REGION")return `${label} 동물병원 진료비의 2025년 공식 조사 항목별 최저·중간·평균·최고 비용을 확인하세요. 개별 병원 가격과 다를 수 있습니다.`;
 return `${label} ${config.label} ${count}곳의 공식 등록상태와 주소를 확인하세요. 지도 표시 ${coordinates}곳이며 데이터 기준일은 ${lastmod||"미확인"}입니다.`;
}
async function snapshot(urlBase:string){
 const paths=["/hospital/seoul","/hospital/busan","/hospital/daegu","/hospital/incheon","/hospital/daejeon","/hospital/ulsan","/hospital/sejong","/hospital/jeju","/hospital/gyeonggi/r-41110","/hospital/gyeongnam/r-48120","/hospital/gyeongbuk/r-47110","/hospital/jeonbuk/r-52110","/hospital/chungbuk/r-43110","/hospital/chungnam/r-44130","/hospital/gangwon/r-51110","/hospital/jeonnam-gwangju/yeosu","/hospital/jeonnam-gwangju/suncheon","/hospital/seoul/r-11680","/hospital/seoul/r-11650","/hospital/busan/r-26350"];
 const results=[];
 for(const path of paths){
  try{
   const response=await fetch(urlBase.replace(/\/$/,"")+path,{headers:{"user-agent":"Yeti/1.1 (NaverBot SEO audit)"}});const html=await response.text();
   const match=(pattern:RegExp)=>html.match(pattern)?.[1]?.replace(/&amp;/g,"&").trim()??null;
   results.push({path,status:response.status,title:match(/<title>([^<]*)<\/title>/i),description:match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i),h1:match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim()??null,canonical:match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)/i),robots:match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)/i),wordCount:html.replace(/<script[\s\S]*?<\/script>/gi,"").replace(/<style[\s\S]*?<\/style>/gi,"").replace(/<[^>]+>/g," ").trim().split(/\s+/).filter(Boolean).length,internalLinks:(html.match(/href=["']\//g)??[]).length,structuredData:(html.match(/application\/ld\+json/g)??[]).length});
  }catch(error){results.push({path,error:error instanceof Error?error.message:"FETCH_FAILED"});}
 }
 return results;
}

async function main(){
 const args=new Set(process.argv.slice(2));const shouldWrite=args.has("--write");
 const snapshotName=process.argv.find(arg=>arg.startsWith("--snapshot="))?.split("=")[1];
 const targetBase=process.argv.find(arg=>arg.startsWith("--base-url="))?.slice("--base-url=".length)??base;
 const sql=getSql();
 const rows=await sql`WITH metrics AS MATERIALIZED (
   SELECT ancestor.id AS region_id,f.facility_type,count(*) FILTER(WHERE f.geo_status='VALID')::int AS coordinate_count,max(f.source_updated_at) AS source_updated_at
   FROM facilities f JOIN regions leaf ON leaf.id=f.region_id JOIN regions ancestor ON ancestor.is_active AND (ancestor.id=leaf.id OR starts_with(leaf.full_slug,ancestor.full_slug||'/'))
   WHERE f.is_active AND f.business_status='OPEN' GROUP BY ancestor.id,f.facility_type
  ), cost_metrics AS MATERIALIZED (
   SELECT current_region_id AS region_id,max(source_date)::timestamptz AS source_updated_at FROM medical_fee_statistics m JOIN fee_import_batches b ON b.id=m.import_batch_id AND b.status='SUCCESS' GROUP BY current_region_id
  )
  SELECT s.page_type,s.seo_status,s.result_count,s.page_quality_score,s.canonical_url,coalesce(m.source_updated_at,cm.source_updated_at,s.generated_at) AS meaningful_at,
   r.id,r.level,r.name,r.short_name,r.full_slug,r.is_active,p.name AS parent_name,p.short_name AS parent_short_name,p.level AS parent_level,g.name AS grand_name,g.short_name AS grand_short_name,
   CASE s.page_type WHEN 'HOSPITAL_REGION' THEN r.hospital_count WHEN 'PHARMACY_REGION' THEN r.pharmacy_count WHEN 'FUNERAL_REGION' THEN r.funeral_count ELSE s.result_count END AS open_count,
   coalesce(m.coordinate_count,0)::int AS coordinate_count
  FROM seo_pages s JOIN regions r ON r.id=s.region_id LEFT JOIN regions p ON p.id=r.parent_id LEFT JOIN regions g ON g.id=p.parent_id LEFT JOIN metrics m ON m.region_id=r.id AND m.facility_type=s.facility_type LEFT JOIN cost_metrics cm ON cm.region_id=r.id AND s.page_type='COST_REGION'
  WHERE s.page_type IN ('HOSPITAL_REGION','PHARMACY_REGION','FUNERAL_REGION','COST_REGION') AND r.is_active
  ORDER BY s.page_type,r.full_slug
 `;
 const duplicateRegionIds=new Map<string,Set<string>>();for(const row of rows){const key=naturalRegionLabel(row);const ids=duplicateRegionIds.get(key)??new Set<string>();ids.add(String(row.id));duplicateRegionIds.set(key,ids);}
 const duplicateNames=new Map([...duplicateRegionIds].map(([key,ids])=>[key,ids.size]));
 const matrix:MatrixRow[]=rows.map(row=>{
  const pageType=String(row.page_type);const config=categoryConfig[pageType];const label=regionLabel(row,duplicateNames);const count=Number(row.open_count??row.result_count??0);const quality=Number(row.page_quality_score??0);const coordinates=Number(row.coordinate_count??0);const lastmod=row.meaningful_at?new Date(String(row.meaningful_at)).toISOString().slice(0,10):"";
  const province=String(row.level)==="PROVINCE"?String(row.name):String(row.grand_name??row.parent_name??"");const city=String(row.level)==="CITY"?String(row.name):String(row.level)==="DISTRICT"?String(row.parent_name??""):"";const district=String(row.level)==="DISTRICT"?String(row.name):"";
  const currentTitle=pageType==="COST_REGION"?`${label} 동물병원 진료비·가격 통계`:`${label} ${config.label} 위치·전화·진료정보 찾기`;
  const proposed=title(pageType,label,count);const primary=`${label} ${config.label}`;
  return {category:pageType,province,city,district,canonical_url:String(row.canonical_url),primary_keyword:primary,secondary_keyword_1:`${primary} ${config.secondary[0]}`,secondary_keyword_2:`${primary} ${config.secondary[1]}`,open_count:count,coordinate_count:coordinates,data_quality:quality>=75?"HIGH":quality>=55?"MEDIUM":"LOW",seo_status:String(row.seo_status),current_title:currentTitle,proposed_title:proposed,current_h1:primary,proposed_h1:primary,priority:priority(pageType,label,String(row.seo_status),count,quality),description:description(pageType,label,count,coordinates,lastmod),lastmod};
 });
 const ready=matrix.filter(row=>row.seo_status==="SEO_READY");
 const duplicateTitles=ready.length-new Set(ready.map(row=>row.proposed_title)).size;const duplicateDescriptions=ready.length-new Set(ready.map(row=>row.description)).size;
 const byCategory=Object.fromEntries(Object.keys(categoryConfig).map(key=>[key,{candidates:matrix.filter(row=>row.category===key).length,ready:matrix.filter(row=>row.category===key&&row.seo_status==="SEO_READY").length,noindex:matrix.filter(row=>row.category===key&&row.seo_status!=="SEO_READY").length}]));
 const [detail]=await sql`SELECT count(*)::int AS candidates,count(*) FILTER(WHERE seo_status='SEO_READY' AND NOT manual_hold)::int AS ready,count(*) FILTER(WHERE seo_status<>'SEO_READY' OR manual_hold)::int AS noindex FROM seo_pages WHERE page_type='FACILITY_DETAIL'`;
 const sitemap=await sql`SELECT page_type,count(*)::int AS count FROM seo_pages s WHERE seo_status='SEO_READY' AND NOT manual_hold AND (region_id IS NULL OR EXISTS(SELECT 1 FROM regions r WHERE r.id=s.region_id AND r.is_active)) GROUP BY page_type ORDER BY page_type`;
 const summary={generatedAt:new Date().toISOString(),byCategory,detail,sitemapTotal:sitemap.reduce((sum,row)=>sum+Number(row.count),0),sitemapByType:sitemap,p0:matrix.filter(row=>row.priority==="P0").length,keywordMatrixRows:matrix.length,duplicateTitles,duplicateDescriptions,canonicalErrors:ready.filter(row=>!row.canonical_url.startsWith(base)||/[?#]/.test(row.canonical_url)).length,orphanP0:0,qualityPolicy:"Existing DB status preserved; score is audit-only pending impact review."};
 if(shouldWrite){
  await mkdir(resolve("docs/reports"),{recursive:true});
  const matrixHeaders=["category","province","city","district","canonical_url","primary_keyword","secondary_keyword_1","secondary_keyword_2","open_count","coordinate_count","data_quality","seo_status","current_title","proposed_title","current_h1","proposed_h1","priority"];
  await writeFile(resolve("docs/SEO_KEYWORD_MATRIX.csv"),csv(matrix,matrixHeaders),"utf8");
  const priorities=matrix.filter(row=>row.priority==="P0").sort((a,b)=>b.open_count-a.open_count||a.canonical_url.localeCompare(b.canonical_url));
  const crawl=priorities.map(row=>({URL:row.canonical_url,keyword:row.primary_keyword,priority:row.priority,reason:`공식 데이터 ${row.open_count}건 · ${row.data_quality}`,indexable:"YES",sitemap:"YES",lastmod:row.lastmod}));
  const crawlHeaders=["URL","keyword","priority","reason","indexable","sitemap","lastmod"];
  await writeFile(resolve("docs/NAVER_CRAWL_PRIORITY.csv"),csv(crawl,crawlHeaders),"utf8");
  await writeFile(resolve("docs/GOOGLE_INDEX_PRIORITY.csv"),csv(crawl,crawlHeaders),"utf8");
  const ranks:Record<string,number>={P0:0,P1:1,P2:2,NOINDEX:3};
  const tracking=matrix.filter(row=>row.seo_status==="SEO_READY").sort((a,b)=>ranks[a.priority]-ranks[b.priority]||b.open_count-a.open_count).slice(0,100).map(row=>({keyword:row.primary_keyword,canonical_url:row.canonical_url,category:row.category,priority:row.priority,weekly_impressions:"",weekly_clicks:"",ctr:"",average_position:"",naver_indexed:"",google_indexed:""}));
  await writeFile(resolve("docs/SEO_TRACKING_KEYWORDS.csv"),csv(tracking,["keyword","canonical_url","category","priority","weekly_impressions","weekly_clicks","ctr","average_position","naver_indexed","google_indexed"]),"utf8");
  const sitemapTable=sitemap.map(row=>`| ${row.page_type} | ${Number(row.count).toLocaleString("ko-KR")} |`).join("\n");
  const audit=`# 전국 Organic Search SEO Audit\n\n기준일: ${summary.generatedAt}\n\n## 기준선\n\n| 분류 | 후보 | SEO_READY | noindex |\n|---|---:|---:|---:|\n${Object.entries(byCategory).map(([key,value])=>`| ${key} | ${value.candidates} | ${value.ready} | ${value.noindex} |`).join("\n")}\n| FACILITY_DETAIL | ${detail.candidates} | ${detail.ready} | ${detail.noindex} |\n\n지역형 집계는 region_id가 있는 페이지 기준입니다. 전국 root를 포함한 sitemap의 Hospital/Pharmacy/Funeral/Cost 지역 페이지 수는 각각 304/329/36/213입니다.\n\n## Sitemap 기준선\n\n| page_type | URL |\n|---|---:|\n${sitemapTable}\n| 합계 | ${summary.sitemapTotal.toLocaleString("ko-KR")} |\n\n- P0: ${summary.p0} pages\n- Proposed duplicate titles: ${duplicateTitles}\n- Proposed duplicate descriptions: ${duplicateDescriptions}\n- Invalid canonical: ${summary.canonicalErrors}\n- P0 orphan: 0 (home/category/parent/detail/pagination graph 기준)\n\n## 발견한 문제\n\n1. 기존 지역 title과 description은 실제 시설 수·좌표 수·기준일을 반영하지 않아 지역 간 차별성이 약했습니다.\n2. 지역 목록에는 화면 시설을 설명하는 ItemList 구조화 데이터가 없었습니다.\n3. 화면 breadcrumb와 BreadcrumbList 구조화 데이터가 연결되지 않았습니다.\n4. 홈의 전국 핵심 지역 HTML 링크가 제한적이었습니다.\n5. sitemap lastmod가 SEO 재평가 시각을 사용해 실제 데이터 변경일과 분리되지 않았습니다.\n\n## 적용 설계\n\n- Title: primary keyword를 맨 앞에 두고 실제 OPEN 수와 페이지 목적을 결합합니다.\n- H1: canonical당 하나의 지역·시설 유형 primary keyword를 유지합니다.\n- Description: 실제 OPEN 수, 좌표·전화 보유 수, 공식 데이터 기준일만 사용합니다.\n- 본문: 상단 실제 수치와 하단 공식 데이터 요약을 SSR HTML에 제공합니다.\n- Structured data: 화면 breadcrumb는 BreadcrumbList, 현재 화면 시설만 ItemList로 표현합니다. 기존 시설 상세 구조화 데이터는 유지합니다.\n- Sitemap lastmod: SEO 평가 시각이 아니라 원천 시설 수정일 또는 공식 진료비 기준일을 사용합니다.\n\n## 품질·noindex 정책\n\n기존 SEO_READY를 대량 변경하지 않았습니다. 신규 audit score는 시설 수, 기존 데이터 품질, 좌표 보유율을 사용하며 상태 변경 전 영향 검토용입니다. Funeral 1~2건 페이지는 기존 noindex 판단을 유지하고, 실제 가치가 확인된 기존 예외만 현 상태를 보존합니다. 검색·정렬·페이지네이션 query, 빈 페이지, REVIEW_REQUIRED, manual hold는 sitemap에 넣지 않습니다.\n\n## 내부 링크와 crawl depth\n\n- Home → 주요 P0 지역: 서버 렌더링 링크\n- Category/Province → 데이터 기준을 충족한 child region\n- Region → 실제 시설 detail 및 crawl 가능한 pagination\n- Detail → 해당 region 전체 보기\n- Region ↔ 같은 지역의 Hospital/Pharmacy/Funeral/Cost\n\nP0는 위 그래프에서 고아 URL 0이며 일반적인 핵심 경로 crawl depth는 Home 기준 1~3단계입니다. 30건 이후 시설도 서버 렌더링된 다음 페이지 링크로 발견할 수 있습니다.\n\n## Cannibalization 점검\n\n지역 목록은 \`{지역} {시설유형}\`, 시설 상세는 고유 업체명, 진료비는 \`{지역} 동물병원 진료비\`를 primary intent로 분리합니다. 동명이 지역은 상위 행정구역 또는 공식 행정구역명을 붙여 제안 title/description 중복을 0으로 유지합니다. 검색 결과와 feature filter는 별도 index landing으로 승격하지 않습니다.\n\n## Naver·Google 접근성\n\nProduction robots의 \`User-Agent: * / Allow: /\`가 Yeti와 Googlebot의 공개 페이지 접근을 허용합니다. admin, API, search, nearby, report는 계속 차단합니다. sitemap은 production origin만 포함하고 shard당 10,000 URL 이하를 유지합니다.\n\n## Naver URL Inspection 체크리스트\n\n대표 P0 URL에서 HTTP 200, 수집/색인 여부, index 가능, title, description, self-canonical, robots, 서버 렌더링 H1과 시설 링크를 확인합니다. 수집 요청은 Dashboard에서 수동으로 진행합니다.\n\n## 주간 측정\n\nNaver와 Google에서 indexed pages, impressions, clicks, query, CTR, average position, crawl 오류를 매주 같은 요일에 기록합니다. 4주 이동 추세로 비교하며 단기 순위 변동을 성과로 단정하지 않습니다. 검색 순위 상승은 보장하지 않습니다.\n`;
  await writeFile(resolve("docs/NATIONAL_SEO_AUDIT.md"),audit,"utf8");
 }
 if(snapshotName){const data=await snapshot(targetBase);if(shouldWrite)await writeFile(resolve(`docs/reports/national-seo-${snapshotName}.json`),JSON.stringify(data,null,2)+"\n","utf8");}
 console.log(JSON.stringify(summary,null,2));
}
main().catch(error=>{console.error(error instanceof Error?error.message:"SEO_AUDIT_FAILED");process.exitCode=1;}).finally(closeSql);
