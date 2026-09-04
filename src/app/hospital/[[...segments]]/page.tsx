import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FacilityList } from "@/components/facility/facility-list";
import { KakaoMap } from "@/components/map/kakao-map";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { MockNotice } from "@/components/data/mock-notice";
import { getFacility, listFacilities } from "@/data/repository";
import { FacilityDetail } from "@/components/facility/facility-detail";
import { evaluateSeo } from "@/lib/seo";

const featureConfig = {
  "24h": { label: "24시간", key: "open24h", minimum: 2, notice: "두들펫에서 24시간 운영 여부가 확인된 병원입니다. 운영정보는 변경될 수 있으므로 방문 전 전화 확인을 권장합니다." },
  night: { label: "야간", key: "nightService", minimum: 3, notice: "검증된 야간 진료 정보가 있는 병원입니다. 오늘 진료 가능 여부는 방문 전 확인하세요." },
  exotic: { label: "특수동물", key: "exoticService", minimum: 3, notice: "특수동물 진료 여부가 확인된 병원입니다. 동물 종과 진료 과목을 먼저 문의하세요." },
} as const;

type Props = { params: Promise<{ segments?: string[] }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

function regionFrom(segments: string[]) { return segments.includes("yeosu") ? "여수" : segments.includes("suncheon") ? "순천" : segments.includes("gwangju") ? "광주" : segments.includes("seoul") ? "서울" : segments.includes("busan") ? "부산" : "전국"; }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const segments = (await params).segments ?? [];
  const last = segments.at(-1);
  if (last?.match(/^[0-9a-f-]{36}$/)) {
    const facility = await getFacility(last);
    return facility ? { title: `${facility.name} - ${facility.city} 동물병원 위치·전화`, description: `${facility.name}의 공식 등록정보, 주소, 전화번호와 두들펫 확인정보를 확인하세요.` } : {};
  }
  const region = regionFrom(segments);
  const feature = last && last in featureConfig ? featureConfig[last as keyof typeof featureConfig] : null;
  const all = await listFacilities("ANIMAL_HOSPITAL");
  const regional = region === "여수" || region === "전국" ? all : [];
  const results = feature ? regional.filter((item) => item.features[feature.key] === "YES" && item.features.verificationStatus === "VALID") : regional;
  const status = evaluateSeo({ pageType: feature ? (last === "24h" ? "HOSPITAL_24H" : last === "night" ? "HOSPITAL_NIGHT" : "HOSPITAL_EXOTIC") : "HOSPITAL_REGION", resultCount: results.length });
  const title = feature ? `${region} ${feature.label} 동물병원 찾기` : `${region} 동물병원 위치·전화·진료정보 찾기`;
  return { title, description: `${region} 공식 등록 동물병원 목록과 지도, 검증된 운영 정보를 확인하세요.`, alternates: { canonical: `/hospital/${segments.join("/")}` }, robots: status === "SEO_READY" ? { index: true, follow: true } : { index: false, follow: true } };
}

export default async function HospitalPage({ params, searchParams }: Props) {
  const segments = (await params).segments ?? [];
  const query = await searchParams;
  const last = segments.at(-1);
  if (last?.match(/^[0-9a-f-]{36}$/)) {
    const facility = await getFacility(last);
    if (!facility || facility.type !== "ANIMAL_HOSPITAL") notFound();
    return <FacilityDetail facility={facility} />;
  }
  const region = regionFrom(segments);
  const all = await listFacilities("ANIMAL_HOSPITAL");
  const regionFacilities = region === "여수" || region === "전국" ? all : [];
  const feature = last && last in featureConfig ? featureConfig[last as keyof typeof featureConfig] : null;
  let shown = feature ? regionFacilities.filter((item) => item.features[feature.key] === "YES" && item.features.verificationStatus === "VALID") : regionFacilities;
  if (query.sort === "name") shown = [...shown].sort((a, b) => a.name.localeCompare(b.name, "ko"));
  const seoStatus = evaluateSeo({ pageType: feature ? (last === "24h" ? "HOSPITAL_24H" : last === "night" ? "HOSPITAL_NIGHT" : "HOSPITAL_EXOTIC") : "HOSPITAL_REGION", resultCount: shown.length });
  const label = feature ? `${region} ${feature.label} 동물병원` : `${region} 동물병원`;
  return (
    <div className="shell listing-page">
      <Breadcrumbs items={[{ label: "동물병원", href: "/hospital" }, ...(region !== "전국" ? [{ label: region }] : [])]} />
      <MockNotice />
      <div className="listing-header"><div><span className="eyebrow">Official registration data</span><h1>{label}</h1><p>{feature?.notice ?? "공식 등록상 영업 중인 병원을 기준으로 안내합니다. 현재 시간의 실제 영업 여부는 검증된 영업시간이 있을 때만 판단합니다."}</p></div><div className="count-box"><strong>{shown.length}</strong><span>확인된 시설</span></div></div>
      <div className="filter-bar" aria-label="병원 필터"><Link className={!feature ? "active" : ""} href="/hospital/jeonnam/yeosu">전체</Link><Link className={last === "24h" ? "active" : ""} href="/hospital/jeonnam/yeosu/24h">24시간</Link><Link className={last === "night" ? "active" : ""} href="/hospital/jeonnam/yeosu/night">야간</Link><Link className={last === "exotic" ? "active" : ""} href="/hospital/jeonnam/yeosu/exotic">특수동물</Link><Link href={`?sort=${query.sort === "name" ? "recommended" : "name"}`}>가나다순</Link></div>
      {seoStatus !== "SEO_READY" && <p className="quality-note">이 페이지는 데이터 기준을 충족할 때까지 검색엔진 색인 대상에서 제외됩니다.</p>}
      <div className="map-list-layout"><aside><KakaoMap facilities={shown} /></aside><FacilityList facilities={shown} /></div>
      {!shown.length && <p><Link className="text-link" href="/hospital/jeonnam/yeosu">여수 전체 동물병원 보기</Link></p>}
    </div>
  );
}
