import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { MockNotice } from "@/components/data/mock-notice";
import { feeCategoryLabels, officialFeeItemByCode, officialFeeItems } from "@/data/fee-catalog";
import { isMockMode, listFeeRegionLinks, listFeeStatistics, resolveRegion } from "@/data/repository";
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
 const slug=segments.join("/");const region=slug?await resolveRegion(slug):null;if(slug&&!region)notFound();
 const query=searchParams?await searchParams:{};const animalType=animalTypes.has(query.animal??"")?query.animal:undefined;const weightClass=weightClasses.has(query.weight??"")?query.weight:undefined;
 const rows=await listFeeStatistics(item,slug||undefined,{animalType,weightClass});const regionLinks=region&&rows.length===0?await listFeeRegionLinks(region.fullSlug):[];
 return {slug,region,item,rows,regionLinks,animalType,weightClass};
}
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {region,item,rows}=await load(params);const label=region?.shortName??region?.name??"지역별";const itemName=item?officialFeeItemByCode.get(item)?.itemName:"";
 const canonical="/cost"+((await params).segments?.length?"/"+(await params).segments!.join("/"):"");
 return {title:item?`${label} 동물병원 ${itemName} 비용·진료비 통계`:`${label} 동물병원 진료비·가격 통계`,description:`${label} 동물병원 진료비의 2025년 공식 지역 통계를 확인하세요. 실제 개별 동물병원의 진료비와 다를 수 있습니다.`,alternates:{canonical},robots:previewRobotsPolicy()??{index:!isMockMode()&&rows.length>0&&await seoApproved(canonical),follow:true}};
}
export const revalidate=21600;
export const runtime="nodejs";
export default async function CostPage({params,searchParams}:Props){
 const {slug,region,item,rows,regionLinks,animalType,weightClass}=await load(params,searchParams);const label=region?.shortName??region?.name??"지역별";const itemName=item?officialFeeItemByCode.get(item)?.itemName:"";
 return <div className="shell listing-page"><Breadcrumbs items={[{label:"진료비",href:"/cost"},...(region?[{label:region.name}]:[]),...(item?[{label:itemName!}]:[])]}/><MockNotice/>
  <div className="listing-header"><div><span className="eyebrow">2025년 공식 지역 진료비 통계</span><h1>{label} 동물병원 {item?`${itemName} 비용`:"진료비"}</h1><p>농림축산식품부 「동물병원 진료비용 현황 조사 및 공개」 자료만 표시합니다. 실제 개별 동물병원의 진료비와 다를 수 있습니다.</p></div></div>
  <form className="card content-panel" method="get"><h2>조건 선택</h2><div className="filter-row"><label>동물<select name="animal" defaultValue={animalType??""}><option value="">전체 조건</option>{Object.entries(animalLabels).map(([value,text])=><option key={value} value={value}>{text}</option>)}</select></label><label>체중<select name="weight" defaultValue={weightClass??""}><option value="">전체 조건</option>{Object.entries(weightLabels).map(([value,text])=><option key={value} value={value}>{text}</option>)}</select></label><button className="secondary-button">검색</button></div></form>
  {!rows.length?<section className="card content-panel"><h2>공식 진료비 데이터를 준비 중입니다.</h2><p>2025년 공식 CSV·XLSX·TXT·OpenAPI 다운로드는 확인되지 않았습니다. 검증된 공식 파일이 공급되기 전에는 숫자를 만들거나 화면 내부 비공개 API를 수집원으로 사용하지 않습니다.</p>
   {region?.level==="PROVINCE"&&regionLinks.length>0&&<><h3>2025년 조사 지역별 통계</h3><p>현재 통합 광역단체 기준 공식 과거 통계는 산출하지 않습니다. 아래 조사 당시 개별 지역 통계를 확인하세요.</p><ul>{regionLinks.map(link=><li key={link.slug}><Link href={`/cost/${link.slug}`}>{link.name} — {link.surveyYear}년 조사 당시 {link.surveyProvinceName}</Link></li>)}</ul></>}
   <Link className="secondary-button" href={slug?`/hospital/${slug}`:"/hospital"}>{region?`${label} 동물병원 보기`:"동물병원 찾기"}</Link></section>:<>
   {!item&&<section className="card content-panel"><h2>공개 항목</h2><div className="chip-list">{officialFeeItems.filter(catalog=>rows.some(row=>row.itemCode===catalog.itemCode)).map(catalog=><Link className="chip-link" href={`/cost/${slug?`${slug}/`:""}${catalog.itemCode}`} key={catalog.itemCode}>{catalog.itemName}</Link>)}</div></section>}
   <div className="card content-panel cost-table-wrap" tabIndex={0} aria-label="진료비 통계 표, 가로로 스크롤 가능"><table className="cost-table"><thead><tr><th>항목 / 조사 당시 지역</th><th>분류·조건</th><th>최저</th><th>중간값</th><th>평균</th><th>최고</th><th>출처 / 표본</th></tr></thead><tbody>{rows.map((stat,index)=><tr key={`${stat.regionLevel}-${stat.surveyRegionCode}-${stat.itemCode}-${stat.animalType}-${stat.weightClass}-${index}`}><td>{stat.itemName}<br/><strong>{stat.regionLevel==="NATIONAL"?"전국":`${stat.surveyYear}년 조사 당시 ${[stat.surveyProvinceName,stat.surveyCityName].filter(Boolean).join(" ")}`}</strong></td><td>{feeCategoryLabels[stat.categoryCode]??stat.categoryCode}<br/>{animalLabels[stat.animalType??""]??stat.animalType} · {weightLabels[stat.weightClass??""]??stat.weightClass}</td><td>{formatWon(stat.minimumPrice)}</td><td><strong>{formatWon(stat.medianPrice)}</strong></td><td>{formatWon(stat.averagePrice)}</td><td>{formatWon(stat.maximumPrice)}</td><td>{stat.sourceUrl&&/^https:\/\//.test(stat.sourceUrl)?<a href={stat.sourceUrl} target="_blank" rel="noreferrer">{stat.sourceName}</a>:stat.sourceName}<br/>표본 {stat.sampleCount??"미공개"} · {stat.sourceDate??"기준일 미확인"}</td></tr>)}</tbody></table></div>
   <p className="quality-note">‘자료 없음’은 0원이 아닙니다. 조사 당시 지역·동물·체중 조건이 다른 통계를 직접 합산하거나 현재 광역단체 통계로 바꾸지 않습니다.</p><Link className="primary-button" href={slug?`/hospital/${slug}`:"/hospital"}>{region?`${label} 동물병원 보기`:"동물병원 찾기"}</Link></>}
 </div>;
}
