import type { Metadata } from "next";
import Link from "next/link";
import { FacilityList } from "@/components/facility/facility-list";
import { MockNotice } from "@/components/data/mock-notice";
import { queryFacilities,listRegions } from "@/data/repository";
export const metadata:Metadata={title:"검색",robots:{index:false,follow:true}};
export default async function SearchPage({searchParams}:{searchParams:Promise<{q?:string;page?:string}>}){
 const params=await searchParams;const query=(params.q??"").trim().slice(0,120);
 const result=query?await queryFacilities({search:query,page:Number(params.page)||1}):{facilities:[],total:0,page:1};
 const regions=query?(await listRegions()).filter(r=>r.name.includes(query)||r.shortName===query):[];
 return <div className="shell listing-page"><MockNotice/><div className="listing-header"><div><h1>{query?`‘${query}’ 검색 결과`:"시설 검색"}</h1><p>지역·시설명·도로명으로 검색합니다.</p></div><div className="count-box"><strong>{result.total}</strong><span>검색 결과</span></div></div><nav className="chip-list">{regions.map(r=><Link className="chip-link" href={`/hospital/${r.fullSlug}`} key={r.id}>{r.shortName} 동물병원 전체 보기</Link>)}</nav>{result.facilities.length?<FacilityList facilities={result.facilities}/>:<div className="card empty-state"><h2>현재 조건에 맞는 시설을 찾지 못했습니다.</h2><p>지역 이름만 입력하거나 검색어를 짧게 바꿔보세요.</p><Link className="text-link" href="/hospital">지역별 동물병원 보기</Link></div>}<nav className="chip-list">{result.page>1&&<Link href={`?q=${encodeURIComponent(query)}&page=${result.page-1}`}>이전</Link>}{result.page*30<result.total&&<Link href={`?q=${encodeURIComponent(query)}&page=${result.page+1}`}>다음</Link>}</nav></div>;
}
