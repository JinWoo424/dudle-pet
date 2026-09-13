import Link from "next/link";
import { MapPin, Navigation, Phone, ShieldCheck } from "lucide-react";
import type { FacilityView } from "@/domain/facility";
import { isMockMode, nearbyFacilities, listFeeStatistics } from "@/data/repository";
import { KakaoMap } from "@/components/map/kakao-map";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { MockNotice } from "@/components/data/mock-notice";
import { FacilityCard } from "./facility-card";
import { formatWon } from "@/lib/format";
import { directionsUrl, facilityPath, safeJson, statusLabels } from "@/lib/facility-display";
import { AdSlot } from "@/components/ads/ad-slot";
import { hasFacilityDetailAdQuality } from "@/components/ads/ad-placement-policy";
import { seoApproved, regionalJourney } from "@/data/seo-repository";
import { RegionalJourney } from "@/components/navigation/regional-journey";
const feeAnimalLabels:Record<string,string>={DOG:"개",CAT:"고양이",ALL:"전체",NOT_APPLICABLE:"구분 없음"};
const feeWeightLabels:Record<string,string>={KG_5:"5kg",KG_10:"10kg",KG_20:"20kg",NOT_APPLICABLE:"구분 없음"};
export async function FacilityDetail({facility,typeLabel="동물병원",typePath="hospital"}:{facility:FacilityView;typeLabel?:string;typePath?:string}) {
 const hasCoordinates=facility.latitude!=null&&facility.longitude!=null;
 let pharmacyRadius=3000;
 let nearbyPharmacies=hasCoordinates?await nearbyFacilities({latitude:facility.latitude!,longitude:facility.longitude!,radiusMeters:pharmacyRadius,type:"ANIMAL_PHARMACY",excludeId:facility.id}):[];
 if(hasCoordinates&&nearbyPharmacies.length<2){pharmacyRadius=5000;nearbyPharmacies=await nearbyFacilities({latitude:facility.latitude!,longitude:facility.longitude!,radiusMeters:pharmacyRadius,type:"ANIMAL_PHARMACY",excludeId:facility.id});}
 if(hasCoordinates&&nearbyPharmacies.length<2){pharmacyRadius=10000;nearbyPharmacies=await nearbyFacilities({latitude:facility.latitude!,longitude:facility.longitude!,radiusMeters:pharmacyRadius,type:"ANIMAL_PHARMACY",excludeId:facility.id});}
 const nearbyHospitals=hasCoordinates?await nearbyFacilities({latitude:facility.latitude!,longitude:facility.longitude!,radiusMeters:10000,type:"ANIMAL_HOSPITAL",excludeId:facility.id}):[];
 const nearbyFunerals=hasCoordinates?await nearbyFacilities({latitude:facility.latitude!,longitude:facility.longitude!,radiusMeters:10000,type:"PET_FUNERAL",excludeId:facility.id}):[];
 const around=[...nearbyPharmacies,...nearbyHospitals,...nearbyFunerals];
 const fees=facility.regionSlug?await listFeeStatistics("xray",facility.regionSlug):[];
 const fee=fees.find(f=>f.regionSlug===facility.regionSlug && f.regionLevel==="CITY");
 const region=[facility.province,facility.city,facility.district].filter(Boolean).join(" ");
 const path=facilityPath(facility);
 const journey=facility.regionSlug?await regionalJourney(facility.regionSlug,path??""):[];
 const costLink=journey.find(link=>link.pageType==="COST_REGION");
 const detailAdsAllowed=!isMockMode()&&path!==null&&hasFacilityDetailAdQuality(facility)&&await seoApproved(path);
 const structured={"@context":"https://schema.org","@type":"LocalBusiness",name:facility.name,address:facility.roadAddress,...(facility.phone?{telephone:facility.phone}:{}),...(path?{url:new URL(path,process.env.NEXT_PUBLIC_SITE_URL||"https://pet.dudle.co.kr").href}:{}),...(hasCoordinates?{geo:{"@type":"GeoCoordinates",latitude:facility.latitude,longitude:facility.longitude}}:{})};
 return <div className="shell detail-page">
 <script type="application/ld+json" dangerouslySetInnerHTML={{__html:safeJson(structured)}}/>
 <Breadcrumbs items={[{label:typeLabel,href:`/${typePath}`},...(facility.regionSlug?[{label:region,href:`/${typePath}/${facility.regionSlug}`}]:[]),{label:facility.name}]}/>
 <section className="detail-hero card"><div><span className="status-open">{statusLabels[facility.businessStatus]}</span><h1>{facility.name}</h1><p className="address"><MapPin size={18}/>{facility.roadAddress||"주소 미확인"}</p></div><div className="detail-cta">{facility.phone&&<a className="primary-button" href={`tel:${facility.phone}`}><Phone size={18}/>전화하기</a>}<a className="secondary-button" href={directionsUrl(facility)} target="_blank" rel="noreferrer"><Navigation size={18}/>길찾기</a></div></section>
 <MockNotice/>
 {facility.regionSlug&&<nav className="detail-region-link" aria-label="지역 시설 목록"><Link className="text-link" href={`/${typePath}/${facility.regionSlug}`}>{region} {typeLabel} 전체 보기</Link></nav>}
 <div className="detail-grid"><div className="detail-main">
 <section className="card detail-section"><h2><ShieldCheck size={21}/>공식 등록정보</h2><dl className="info-grid"><div><dt>영업 상태</dt><dd>{statusLabels[facility.businessStatus]}</dd></div><div><dt>전화번호</dt><dd>{facility.phone||"정보 없음"}</dd></div><div><dt>주소</dt><dd>{facility.roadAddress||"미확인"}</dd></div><div><dt>출처</dt><dd>{facility.sourceName}</dd></div><div><dt>원천 데이터 수정일</dt><dd>{facility.sourceDate}</dd></div><div><dt>두들펫 최종 동기화일</dt><dd>{facility.syncedAt||"미확인"}</dd></div></dl><p className="quality-note">공식 등록상 영업은 현재 시간에 진료 중이라는 뜻이 아닙니다. 방문 전 전화로 확인하세요.</p></section>
 <section className="card detail-section"><h2>두들펫 확인정보</h2><div className="tag-row">{facility.features.verificationStatus==="VALID"&&<>{facility.features.open24h==="YES"&&<span className="pill">24시간</span>}{facility.features.nightService==="YES"&&<span className="pill">야간 진료</span>}{facility.features.exoticService==="YES"&&<span className="pill">특수동물</span>}</>}</div><p className="muted">{facility.features.verificationStatus==="VALID" ? `근거와 유효기간이 있는 확인정보만 표시합니다. 최근 확인일: ${facility.features.verifiedAt}`:"추가 운영정보는 아직 확인되지 않았습니다. 미확인은 ‘아니오’가 아닙니다."}</p></section>
 {Boolean(facility.verifications?.length)&&<section className="card detail-section"><h2>확인 근거</h2><ul>{facility.verifications!.map(v=><li key={v.fieldName}><strong>{{open_24h:"24시간",night_service:"야간",exotic_service:"특수동물",cat_service:"고양이",parking_available:"주차"}[v.fieldName]??v.fieldName}: {v.fieldValue}</strong><p>{v.evidenceNote} · {v.sourceType}</p><p>확인일 {new Intl.DateTimeFormat("ko-KR",{timeZone:"Asia/Seoul"}).format(new Date(v.verifiedAt))} · 만료일 {new Intl.DateTimeFormat("ko-KR",{timeZone:"Asia/Seoul"}).format(new Date(v.expiresAt))}</p>{v.sourceUrl&&/^https?:\/\//.test(v.sourceUrl)&&<a href={v.sourceUrl} target="_blank" rel="noreferrer">확인 출처 보기</a>}</li>)}</ul></section>}
 <section className="card detail-section"><h2>지도</h2><KakaoMap facilities={[facility]}/></section>
 <AdSlot placement="FACILITY_DETAIL_1" pageType="FACILITY_DETAIL" monetization={detailAdsAllowed?"LIMITED":"OFF"}/>
 {facility.type==="ANIMAL_HOSPITAL"&&<section className="card detail-section"><h2>{region} X-ray 진료비</h2>{fee?<><strong>{formatWon(fee.medianPrice)}</strong><p>{fee.sourceName} · {fee.surveyYear}년 · {feeWeightLabels[fee.weightClass??""]??"체중 미확인"} · {feeAnimalLabels[fee.animalType??""]??"동물 구분 미확인"}</p></>:<p className="muted">이 지역의 공식 진료비 통계는 아직 등록되지 않았습니다.</p>}<p className="quality-note">지역 통계이며 이 병원의 실제 가격이 아닙니다.</p>{costLink&&<Link href={costLink.path}>{costLink.regionName} 진료비 통계 확인{costLink.scope==="parent"?" (상위 지역)":""}</Link>}</section>}
 <RegionalJourney links={journey}/>
 <section className="card detail-section"><h2>정보수정 요청</h2><p className="muted">전화번호, 주소, 운영정보가 다르면 알려주세요.</p><Link className="secondary-button" href={`/report?facility=${facility.id}`}>정보수정 요청</Link></section>
 </div><aside className="detail-aside">{(["ANIMAL_PHARMACY","ANIMAL_HOSPITAL","PET_FUNERAL"] as const).map((kind,i)=><section key={kind}><h2>{kind==="ANIMAL_PHARMACY"?`주변 동물약국 (직선거리 ${pharmacyRadius/1000}km 이내)`:["","가까운 다른 병원","주변 장례시설"][i]}</h2>{around.filter(f=>f.type===kind).slice(0,2).map(f=><FacilityCard key={f.id} facility={f} compact/>)}{!around.some(f=>f.type===kind)&&<p className="muted">{hasCoordinates?`직선거리 ${kind==="ANIMAL_PHARMACY"?pharmacyRadius/1000:10}km 내 확인된 시설이 없습니다.`:"기준 좌표가 없어 거리를 계산할 수 없습니다."}</p>}</section>)}</aside></div></div>;
}
