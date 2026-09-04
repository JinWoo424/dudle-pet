import type { Metadata } from "next";
import Link from "next/link";
import { NearbyClient } from "@/components/nearby/nearby-client";

export const metadata: Metadata = { title: "내 주변 반려동물 시설", robots: { index: false, follow: true } };
export default function NearbyPage() { return <div className="shell listing-page"><div className="listing-header"><div><span className="eyebrow">Nearby</span><h1>내 주변 시설 찾기</h1><p>정확한 위치는 시설 검색에만 사용하며 영구 저장하지 않습니다.</p></div></div><NearbyClient /><p><Link className="text-link" href="/hospital/jeonnam/yeosu">위치 없이 지역으로 찾기</Link></p></div>; }

