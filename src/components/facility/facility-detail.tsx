import Script from "next/script";
import Link from "next/link";
import { BadgeCheck, CalendarClock, MapPin, Navigation, Phone, ShieldCheck } from "lucide-react";
import type { FacilityView } from "@/domain/facility";
import { listFacilities, listFeeStatistics } from "@/data/repository";
import { KakaoMap } from "@/components/map/kakao-map";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { FacilityCard } from "./facility-card";
import { formatWon } from "@/lib/format";

export async function FacilityDetail({ facility, typeLabel = "동물병원", typePath = "hospital" }: { facility: FacilityView; typeLabel?: string; typePath?: string }) {
  const all = await listFacilities();
  const nearbyPharmacies = all.filter((item) => item.type === "ANIMAL_PHARMACY").slice(0, 2);
  const otherHospitals = all.filter((item) => item.type === "ANIMAL_HOSPITAL" && item.id !== facility.id).slice(0, 2);
  const fee = (await listFeeStatistics("xray")).find((item) => item.regionLevel === "CITY");
  const structured = { "@context": "https://schema.org", "@type": "LocalBusiness", name: facility.name, address: facility.roadAddress, telephone: facility.phone, url: `https://pet.dudle.co.kr/hospital/jeonnam/yeosu/${facility.id}`, ...(facility.latitude && facility.longitude ? { geo: { "@type": "GeoCoordinates", latitude: facility.latitude, longitude: facility.longitude } } : {}) };
  return (
    <div className="shell detail-page">
      <Script id="facility-structured-data" type="application/ld+json">{JSON.stringify(structured)}</Script>
      <Breadcrumbs items={[{ label: typeLabel, href: `/${typePath}` }, { label: "여수", href: `/${typePath}/jeonnam/yeosu` }, { label: facility.name }]} />
      <section className="detail-hero card">
        <div><span className="status-open"><span />공식 등록상 영업</span><h1>{facility.name}</h1><p className="address"><MapPin size={18} />{facility.roadAddress}</p></div>
        <div className="detail-cta">{facility.phone && <a className="primary-button" href={`tel:${facility.phone}`}><Phone size={18} />전화하기</a>}<a className="secondary-button" href={`https://map.kakao.com/link/search/${encodeURIComponent(facility.roadAddress)}`} target="_blank" rel="noreferrer"><Navigation size={18} />길찾기</a></div>
      </section>
      <div className="detail-grid">
        <div className="detail-main">
          <section className="card detail-section"><h2><ShieldCheck size={21} />공식 등록정보</h2><dl className="info-grid"><div><dt>영업 상태</dt><dd>공식 등록상 영업</dd></div><div><dt>전화번호</dt><dd>{facility.phone ?? "정보 없음"}</dd></div><div><dt>주소</dt><dd>{facility.roadAddress}</dd></div><div><dt>데이터 기준일</dt><dd>{facility.sourceDate}</dd></div></dl></section>
          <section className="card detail-section"><h2><BadgeCheck size={21} />두들펫 확인정보</h2>{facility.features.verificationStatus === "VALID" ? <><div className="tag-row">{facility.features.open24h === "YES" && <span className="pill">24시간</span>}{facility.features.nightService === "YES" && <span className="pill">야간 진료</span>}{facility.features.exoticService === "YES" && <span className="pill">특수동물</span>}{facility.features.parkingAvailable === "YES" && <span className="pill">주차</span>}</div><p className="evidence"><CalendarClock size={16} />{facility.features.verifiedAt} 확인 · {facility.features.sourceLabel}</p></> : <p className="muted">추가 운영정보는 아직 확인되지 않았습니다. 미확인은 ‘아니오’가 아닙니다.</p>}</section>
          <section className="card detail-section"><h2>지도</h2><KakaoMap facilities={[facility]} /></section>
          <section className="card detail-section"><div className="section-heading"><div><span className="eyebrow">지역 통계</span><h2>여수 지역 X-ray 진료비</h2></div><Link className="text-link" href="/cost/jeonnam/yeosu/xray">자세히</Link></div><div className="stat-highlight"><span>중간값</span><strong>{formatWon(fee?.medianPrice ?? null)}</strong></div><p className="quality-note">이 병원의 실제 진료비가 아닌 여수 지역 통계입니다.</p></section>
          <section className="card detail-section"><h2>정보수정 요청</h2><p className="muted">전화번호, 주소, 운영시간이나 서비스 정보가 다르면 알려주세요.</p><Link className="secondary-button" href={`/report?facility=${facility.id}`}>정보수정 요청</Link></section>
        </div>
        <aside className="detail-aside"><section><h2>주변 동물약국</h2>{nearbyPharmacies.map((item) => <FacilityCard facility={item} compact key={item.id} />)}</section><section><h2>가까운 다른 병원</h2>{otherHospitals.map((item) => <FacilityCard facility={item} compact key={item.id} />)}</section></aside>
      </div>
    </div>
  );
}
