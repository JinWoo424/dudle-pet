import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { MockNotice } from "@/components/data/mock-notice";
import { isMockMode, listFeeStatistics, resolveRegion } from "@/data/repository";
import { formatWon } from "@/lib/format";
import { seoApproved } from "@/data/seo-repository";
type Props={params:Promise<{segments?:string[]}>};
const items=new Set(["consultation","vaccination","blood-test","xray","ultrasound","ct","mri"]);
async function load(params:Props["params"]) {
 const segments=[...((await params).segments??[])];
 const item=items.has(segments.at(-1)??"")?segments.pop():undefined;
 if(segments.length>3||segments.some(s=>!/^[a-z0-9-]+$/.test(s))) notFound();
 const slug=segments.join("/");
 const region=slug?await resolveRegion(slug):null;
 if(slug&&!region) notFound();
 const rows=await listFeeStatistics(item,slug||undefined);
 return {slug,region,item,rows};
}
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {region,item,rows}=await load(params);
 const canonical="/cost"+((await params).segments?.length?"/"+(await params).segments!.join("/"):"");
 return {title:`${region?.name??"지역별"} 동물병원 ${rows[0]?.itemName&&item?rows[0].itemName:"진료비"} 통계`,alternates:{canonical},robots:{index:!isMockMode()&&rows.length>0&&await seoApproved(canonical),follow:true}};
}
export const revalidate=21600;
export default async function CostPage({params}:Props) {
 const {slug,region,item,rows}=await load(params);
 return <div className="shell listing-page"><Breadcrumbs items={[{label:"진료비",href:"/cost"},...(region?[{label:region.name}]:[])]}/><MockNotice/>
 <div className="listing-header"><div><span className="eyebrow">지역 진료비 통계</span><h1>{region?.name??"지역별"} 동물병원 {item?(rows[0]?.itemName??item):"진료비"} 통계</h1><p>공식 조사의 지역 통계입니다. 개별 병원의 실제 가격이 아니며, 동물 상태와 진료 조건에 따라 달라집니다.</p></div></div>
 {!rows.length?<section className="card content-panel"><h2>공식 진료비 자료 연결 대기</h2><p>검증된 공식 자료를 등록한 뒤 통계를 표시합니다. 자료가 없는 항목에 임의의 숫자를 표시하지 않습니다.</p><Link href={slug?`/hospital/${slug}`:"/hospital"}>동물병원 찾기</Link></section>:<>
 <div className="card content-panel cost-table-wrap" tabIndex={0} aria-label="진료비 통계 표, 가로로 스크롤 가능"><table className="cost-table"><thead><tr><th>항목 / 지역</th><th>조사 조건</th><th>최저</th><th>중간값</th><th>평균</th><th>최고</th><th>출처 / 표본</th></tr></thead><tbody>{rows.map((stat,i)=><tr key={i}><td>{slug&&!item?<Link href={`/cost/${slug}/${stat.itemCode}`}>{stat.itemName}</Link>:stat.itemName}<br/>{stat.region}</td><td>{stat.surveyYear}년<br/>{stat.animalType??"자료 기준"} · {stat.weightClass??"자료 기준"}</td><td>{formatWon(stat.minimumPrice)}</td><td><strong>{formatWon(stat.medianPrice)}</strong></td><td>{formatWon(stat.averagePrice)}</td><td>{formatWon(stat.maximumPrice)}</td><td>{stat.sourceUrl&&/^https?:\/\//.test(stat.sourceUrl)?<a href={stat.sourceUrl} target="_blank" rel="noreferrer">{stat.sourceName}</a>:stat.sourceName}<br/>표본 {stat.sampleCount??"미공개"} · {stat.sourceDate??"기준일 미확인"}</td></tr>)}</tbody></table></div><p className="quality-note">‘자료 없음’은 0원이 아닙니다. 동물 종류·체중·조사연도가 다른 통계는 직접 비교하지 마세요.</p></>}
 </div>;
}
