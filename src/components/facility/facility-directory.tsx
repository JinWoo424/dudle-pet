import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { FacilityList } from "./facility-list";
import { FacilityDetail } from "./facility-detail";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { KakaoMap } from "@/components/map/kakao-map";
import { MockNotice } from "@/components/data/mock-notice";
import { getFacility, listFacilities } from "@/data/repository";
import type { FacilityKind } from "@/domain/facility";

const config = {
  ANIMAL_PHARMACY: { label: "동물약국", path: "pharmacy", intro: "공식 등록 동물약국의 주소와 전화번호를 확인하세요." },
  PET_FUNERAL: { label: "반려동물 장례시설", path: "funeral", intro: "공식 등록된 반려동물 장례시설을 확인하세요." },
} as const;

export async function directoryMetadata(type: keyof typeof config, segments: string[]): Promise<Metadata> {
  const item = config[type];
  const region = segments.includes("yeosu") ? "여수" : segments.includes("jeonnam") ? "전남" : "전국";
  const count = region === "전국" || region === "전남" || region === "여수" ? (await listFacilities(type)).length : 0;
  const ready = count >= (type === "ANIMAL_PHARMACY" ? 5 : 2);
  return { title: `${region} ${item.label}`, description: `${region} ${item.label} 목록, 공식 등록상태, 주소와 전화번호를 확인하세요.`, alternates: { canonical: `/${item.path}/${segments.join("/")}` }, robots: ready ? { index: true, follow: true } : { index: false, follow: true } };
}

export async function FacilityDirectory({ type, segments }: { type: keyof typeof config; segments: string[] }) {
  const item = config[type];
  const last = segments.at(-1);
  if (last?.match(/^[0-9a-f-]{36}$/)) {
    const facility = await getFacility(last);
    if (!facility || facility.type !== type) notFound();
    return <FacilityDetail facility={facility} typeLabel={item.label} typePath={item.path} />;
  }
  const region = segments.includes("yeosu") ? "여수" : segments.includes("jeonnam") ? "전남" : "전국";
  const facilities = region === "전국" || region === "전남" || region === "여수" ? await listFacilities(type as FacilityKind) : [];
  return <div className="shell listing-page"><Breadcrumbs items={[{ label: item.label }]} /><MockNotice /><div className="listing-header"><div><span className="eyebrow">Official registration data</span><h1>{region} {item.label}</h1><p>{item.intro} 실제 운영 여부는 방문 전에 시설에 직접 확인하세요.</p></div><div className="count-box"><strong>{facilities.length}</strong><span>확인된 시설</span></div></div><div className="map-list-layout"><aside><KakaoMap facilities={facilities} /></aside><FacilityList facilities={facilities} /></div></div>;
}
