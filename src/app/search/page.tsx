import type { Metadata } from "next";
import Link from "next/link";
import { FacilityList } from "@/components/facility/facility-list";
import { searchFacilities } from "@/data/repository";

export const metadata: Metadata = { title: "검색", robots: { index: false, follow: true } };
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const query = (await searchParams).q?.trim() ?? "";
  const results = query ? await searchFacilities(query) : [];
  return <div className="shell listing-page"><div className="listing-header"><div><span className="eyebrow">Search</span><h1>{query ? `‘${query}’ 검색 결과` : "시설 검색"}</h1><p>지역, 시설명, 도로명과 동 이름으로 검색할 수 있습니다.</p></div>{query && <div className="count-box"><strong>{results.length}</strong><span>검색 결과</span></div>}</div>{results.length ? <FacilityList facilities={results} /> : <div className="card empty-state"><h2>현재 조건에 맞는 시설을 찾지 못했습니다.</h2><p>지역 이름만 입력하거나 검색어를 짧게 바꿔보세요.</p><Link className="text-link" href="/hospital/jeonnam/yeosu">여수 전체 동물병원 보기</Link></div>}</div>;
}

