import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { MockNotice } from "@/components/data/mock-notice";
import { costRegionSlug, currentRegionSlugFromCost, feeCategoryLabels, officialFeeItemByCode, officialFeeItems } from "@/data/fee-catalog";
import { isMockMode, listFeeRegionLinks, listFeeStatistics, listFeeYears, resolveRegion } from "@/data/repository";
import { formatWon } from "@/lib/format";
import { seoApproved } from "@/data/seo-repository";
import { previewRobotsPolicy } from "@/lib/deployment";
type Props={params:Promise<{segments?:string[]}>;searchParams:Promise<Record<string,string|undefined>>};
const itemCodes=new Set(officialFeeItems.map(item=>item.itemCode));
const animalTypes=new Set(["DOG","CAT","ALL","NOT_APPLICABLE"]),weightClasses=new Set(["KG_5","KG_10","KG_20","NOT_APPLICABLE"]);
const animalLabels:Record<string,string>={DOG:"개",CAT:"고양이",ALL:"전체",NOT_APPLICABLE:"구분 없음"};
const weightLabels:Record<string,string>={KG_5:"5kg",KG_10:"10kg",KG_20:"20kg",NOT_APPLICABLE:"구분 없음"};
async function load(params:Props["params"],searchParams?:Props["searchParams"]){
 const segments=[...((await params).segments??[])];const item=itemCodes.has(segments.at(-1)??"")?segments.pop():undefined;
 if(segments.length>3||segments.some(segment=>!/^[a-z0-9-]+$/.test(segment)))notFound();
 const slug=segments.join("/");const currentSlug=currentRegionSlugFromCost(slug);const region=slug?await resolveRegion(currentSlug):null;if(slug&&!region)notFound();
 const parent=region?.level==='CITY'?await resolveRegion(currentSlug.split('/')[0]):null;
 const query=searchParams?await searchParams:{};const animalType=animalTypes.has(query.animal??"")?query.animal:undefined;const weightClass=weightClasses.has(query.weight??"")?query.weight:undefined;
 if(query.region!==undefined||query.item!==undefined){
  const target=query.region??slug,chosen=query.item||undefined;
  if(target&&!/^[a-z0-9-]+(?:\/[a-z0-9-]+){0,2}$/.test(target))notFound();if(chosen&&!itemCodes.has(chosen))notFound();
  const filters=new URLSearchParams();for(const key of ['year','animal','weight'])if(query[key])filters.set(key,query[key]!);
  redirect('/cost'+(target?'/'+target:'')+(chosen?'/'+chosen:'')+(filters.size?'?'+filters:''));
 }
 const years=await listFeeYears();const surveyYear=query.year?Number(query.year):years[0];if(query.year&&!years.includes(surveyYear))notFound();
 const allRows=await listFeeStatistics(item,currentSlug||undefined,{surveyYear});
 const filtered=allRows.filter(r=>(!animalType||r.animalType===animalType)&&(!weightClass||r.weightClass===weightClass));
 const ownRows=filtered.filter(r=>currentSlug?r.regionSlug===currentSlug:r.regionLevel==='NATIONAL');
 const rows=ownRows.length?filtered:[];const regionLinks=await listFeeRegionLinks('',surveyYear);
 return {slug,currentSlug,region,parent,item,rows,ownRows,allRows,regionLinks,animalType,weightClass,years,surveyYear,query};
}
export async function generateMetadata({params,searchParams}:Props):Promise<Metadata>{
 const {region,item,ownRows:rows,surveyYear,query}=await load(params,searchParams);const label=region?.shortName??region?.name??"전국";const itemName=item?officialFeeItemByCode.get(item)?.itemName:"";
 const canonical="/cost"+((await params).segments?.length?"/"+(await params).segments!.join("/"):"");
 return {title:item?`${label} 동물병원 ${itemName} 비용·진료비 통계`:`${label} 동물병원 진료비·가격 통계`,description:`${label} 동물병원 진료비의 ${surveyYear??'공식'}년 지역 통계를 확인하세요. 실제 개별 동물병원의 진료비와 다를 수 있습니다.`,alternates:{canonical},robots:previewRobotsPolicy()??{index:!isMockMode()&&!Object.keys(query).length&&rows.some(r=>[r.minimumPrice,r.medianPrice,r.averagePrice,r.maximumPrice].some(p=>p!==null))&&await seoApproved(canonical),follow:true}};
}
export const revalidate=21600;
export const runtime="nodejs";
export default async function CostPage({params,searchParams}:Props){
 const {slug,currentSlug,region,parent,item,rows,ownRows,allRows,regionLinks,animalType,weightClass,years,surveyYear}=await load(params,searchParams);const label=region?.shortName??region?.name??"전국";const itemName=item?officialFeeItemByCode.get(item)?.itemName:"";
 const focus=ownRows.find(r=>r.itemCode===(item??'initial-consultation')&&r.weightClass==='KG_5')??ownRows[0];
 const priceCards:{label:string;value:number|null}[]=focus?[{label:'중간비용',value:focus.medianPrice},{label:'평균비용',value:focus.averagePrice},{label:'최저비용',value:focus.minimumPrice},{label:'최고비용',value:focus.maximumPrice}]:[];
 return <div className="shell listing-page"><Breadcrumbs items={[{label:"진료비",href:"/cost"},...(region?[{label:region.name}]:[]),...(item?[{label:itemName!}]:[])]}/><MockNotice/>
  <div className="listing-header"><div><span className="eyebrow">{surveyYear?`${surveyYear}년 `:''}공식 지역 진료비 통계</span><h1>{label} 동물병원 {item?`${itemName} 비용`:"진료비"}</h1><p>농림축산식품부 「동물병원 진료비용 현황 조사 및 공개」 자료만 표시합니다. 실제 개별 동물병원의 진료비와 다를 수 있습니다.</p></div></div>
  <form className="card content-panel" method="get"><h2>진료비 찾기</h2><div className="fee-selectors">
   <label>조사년도<select name="year" defaultValue={surveyYear??''}>{years.map(y=><option key={y} value={y}>{y}년</option>)}{!years.length&&<option value="">자료 없음</option>}</select></label>
   <label>지역<select name="region" defaultValue={slug}><option value="">전국</option>{slug&&!regionLinks.some(r=>costRegionSlug(r.slug)===slug)&&<option value={slug}>{region?.name}</option>}{regionLinks.map(r=><option key={r.slug} value={costRegionSlug(r.slug)}>{r.surveyProvinceName} {r.name===r.surveyProvinceName?'':r.name}</option>)}</select></label>
   <label>진료항목<select name="item" defaultValue={item??''}><option value="">전체 항목</option>{officialFeeItems.map(i=><option key={i.itemCode} value={i.itemCode}>{i.itemName}</option>)}</select></label>
   <label>동물<select name="animal" defaultValue={animalType??""}><option value="">모든 제공 조건</option>{Object.entries(animalLabels).filter(([v])=>allRows.some(r=>r.animalType===v)).map(([value,text])=><option key={value} value={value}>{text}</option>)}</select></label><label>체중<select name="weight" defaultValue={weightClass??""}><option value="">모든 제공 조건</option>{Object.entries(weightLabels).filter(([v])=>allRows.some(r=>r.weightClass===v&&(!animalType||r.animalType===animalType))).map(([value,text])=><option key={value} value={value}>{text}</option>)}</select></label><button className="secondary-button">조회</button></div></form>
  {focus&&<section className="card content-panel"><h2>{focus.itemName} · {animalLabels[focus.animalType??'']} · {weightLabels[focus.weightClass??'']}</h2><p>{focus.region} · {focus.surveyYear}년</p><div className="fee-price-grid">{priceCards.map(c=><div key={c.label}><span>{c.label}</span><strong>{formatWon(c.value)}</strong></div>)}</div></section>}
  {focus&&region?.level==='CITY'&&<section className="card content-panel"><h2>조사 당시 지역</h2><p>현재 행정구역: {parent?.name} {region.name}</p><p>{focus.surveyYear}년 조사 당시: {focus.surveyProvinceName} {focus.surveyCityName}</p><p>원본 조사 지역을 보존합니다. 현재 광역단체 기준으로 과거 통계를 재합산하지 않습니다.</p></section>}
  {!rows.length?<section className="card content-panel"><h2>이 지역·조건의 공식 진료비 통계가 없습니다.</h2><p>공개되지 않은 값을 0원으로 표시하거나 추정하지 않습니다.</p>
   {region?.level==="PROVINCE"&&regionLinks.some(r=>r.slug.startsWith(currentSlug+'/'))&&<><h3>{surveyYear}년 조사 지역별 통계</h3><p>{surveyYear}년 현재 통합 광역단체 기준 공식 통계 없음. 아래 조사 당시 개별 지역 통계를 확인하세요.</p><ul>{regionLinks.filter(r=>r.slug.startsWith(currentSlug+'/')).map(link=><li key={link.slug}><Link href={`/cost/${costRegionSlug(link.slug)}`}>{link.name} — {link.surveyYear}년 조사 당시 {link.surveyProvinceName}</Link></li>)}</ul></>}
   <Link className="secondary-button" href={currentSlug?`/hospital/${currentSlug}`:"/hospital"}>{region?`${label} 동물병원 보기`:"동물병원 찾기"}</Link></section>:<>
   {!item&&<section className="card content-panel"><h2>공개 항목</h2><div className="chip-list">{officialFeeItems.filter(catalog=>rows.some(row=>row.itemCode===catalog.itemCode)).map(catalog=><Link className="chip-link" href={`/cost/${slug?`${slug}/`:""}${catalog.itemCode}`} key={catalog.itemCode}>{catalog.itemName}</Link>)}</div></section>}
   <div className="card content-panel cost-table-wrap" tabIndex={0} aria-label="진료비 통계 표, 가로로 스크롤 가능"><table className="cost-table"><thead><tr><th>항목 / 조사 당시 지역</th><th>분류·조건</th><th>최저</th><th>중간값</th><th>평균</th><th>최고</th><th>출처 / 표본</th></tr></thead><tbody>{rows.map((stat,index)=><tr key={`${stat.regionLevel}-${stat.surveyRegionCode}-${stat.itemCode}-${stat.animalType}-${stat.weightClass}-${index}`}><td>{stat.itemName}<br/><strong>{stat.regionLevel==="NATIONAL"?"전국":`${stat.surveyYear}년 조사 당시 ${[stat.surveyProvinceName,stat.surveyCityName].filter(Boolean).join(" ")}`}</strong></td><td>{feeCategoryLabels[stat.categoryCode]??stat.categoryCode}<br/>{animalLabels[stat.animalType??""]??stat.animalType} · {weightLabels[stat.weightClass??""]??stat.weightClass}</td><td>{formatWon(stat.minimumPrice)}</td><td><strong>{formatWon(stat.medianPrice)}</strong></td><td>{formatWon(stat.averagePrice)}</td><td>{formatWon(stat.maximumPrice)}</td><td>{stat.sourceUrl&&/^https:\/\//.test(stat.sourceUrl)?<a href={stat.sourceUrl} target="_blank" rel="noreferrer">{stat.sourceName}</a>:stat.sourceName}<br/>표본 {stat.sampleCount??"미공개"} · {stat.sourceDate??"기준일 미확인"}</td></tr>)}</tbody></table></div>
   <p className="quality-note">‘자료 없음’은 0원이 아닙니다. 조사 당시 지역·동물·체중 조건이 다른 통계를 직접 합산하거나 현재 광역단체 통계로 바꾸지 않습니다.</p><p>데이터 출처: 농림축산식품부 · 조사년도 {surveyYear}년 · 공개 기준일 {focus?.sourceDate??rows[0]?.sourceDate??'미확인'} · 수집일 {focus?.collectedAt?new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date(focus.collectedAt)):'미확인'}</p><Link className="primary-button" href={currentSlug?`/hospital/${currentSlug}`:"/hospital"}>{region?`${label} 동물병원 보기`:"동물병원 찾기"}</Link></>}
 </div>;
}
