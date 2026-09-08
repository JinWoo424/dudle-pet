import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Clock3, Cross, HeartHandshake, MapPin, Pill, ReceiptText, ShieldCheck } from "lucide-react";
import { HomeSearch } from "@/components/search/home-search";
import type { Metadata } from "next";
import { AdSlot } from "@/components/ads/ad-slot";

export const metadata: Metadata = { alternates: { canonical: "/" } };

const categories = [
  { href: "/hospital", label: "동물병원", detail: "지역별 공식 등록 병원", icon: Cross },
  { href: "/hospital/jeonnam/yeosu/24h", label: "24시·야간", detail: "검증된 운영 정보", icon: Clock3 },
  { href: "/cost", label: "진료비", detail: "지역별 공식 가격 통계", icon: ReceiptText },
  { href: "/pharmacy", label: "동물약국", detail: "주변 등록 약국", icon: Pill },
  { href: "/funeral", label: "반려동물 장례", detail: "합법 등록 시설", icon: HeartHandshake },
];

const guides = [
  ["24시간", "24시간 동물병원 방문 전 확인사항", "/guide/24-hour-hospital-checklist"],
  ["동물약국", "동물약국 방문 전 무엇을 확인할까요?", "/guide/animal-pharmacy"],
  ["진료비", "지역 진료비 통계를 정확히 보는 방법", "/guide/medical-cost-statistics"],
];

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="shell hero-grid">
          <div>
            <span className="eyebrow">공식 데이터로 찾는 반려생활 정보</span>
            <h1>우리 동네 동물병원과<br />진료비를 한 번에 확인하세요</h1>
            <p className="hero-lede">병원 이름만 나열하지 않습니다. 공식 등록 상태, 검증 정보, 위치와 지역 진료비 통계를 구분해 보여드립니다.</p>
            <HomeSearch />
            <div className="hero-actions">
              <Link className="text-link" href="/nearby"><MapPin size={18} aria-hidden="true" />내 주변 병원 찾기<ArrowRight size={16} aria-hidden="true" /></Link>
              <span className="muted">위치는 검색할 때만 사용해요</span>
            </div>
          </div>
          <div className="hero-visual" aria-label="지도에서 반려동물 시설을 찾는 강아지와 고양이 일러스트">
            <Image src="/images/pet-map-hero.png" alt="지도 위치 표시 옆에 앉아 있는 강아지와 고양이" fill priority sizes="(max-width: 900px) 100vw, 48vw" />
            <div className="data-badge"><BadgeCheck size={18} aria-hidden="true" /> 공공데이터와 두들펫 확인정보를 분리해서 안내합니다.</div>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="category-heading">
        <div className="shell">
          <div className="section-heading"><div><span className="eyebrow">바로 찾기</span><h2 id="category-heading">필요한 정보부터 확인하세요</h2></div></div>
          <div className="category-grid">
            {categories.map(({ href, label, detail, icon: Icon }) => (
              <Link className="card category-card" href={href} key={href}>
                <span className="category-icon"><Icon size={22} aria-hidden="true" /></span>
                <span><strong>{label}</strong><small>{detail}</small></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <AdSlot placement="HOME_CONTENT_1" pageType="HOME" monetization="FULL" />

      <section className="section" aria-label="인기 탐색">
        <div className="shell split-grid">
          <div className="card content-panel">
            <span className="eyebrow">많이 찾는 지역</span>
            <h2>지역별 동물병원</h2>
            <div className="chip-list">
              <Link className="chip-link" href="/hospital/jeonnam-gwangju/yeosu">여수</Link>
              <Link className="chip-link" href="/hospital/jeonnam-gwangju/suncheon">순천</Link>
              <Link className="chip-link" href="/hospital/jeonnam-gwangju">전남광주</Link>
              <Link className="chip-link" href="/hospital/seoul">서울</Link>
              <Link className="chip-link" href="/hospital/busan">부산</Link>
            </div>
          </div>
          <div className="card content-panel">
            <span className="eyebrow">많이 확인하는 진료비</span>
            <h2>항목별 지역 통계</h2>
            <p>검증된 공식 파일이 등록된 항목만 공개합니다. 자료가 없는 항목에 가상 가격을 표시하지 않습니다.</p><Link className="chip-link" href="/cost">공식 진료비 데이터 상태 확인</Link>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="guide-heading">
        <div className="shell">
          <div className="section-heading"><div><span className="eyebrow">반려생활 가이드</span><h2 id="guide-heading">가기 전에 한 번 더 확인하세요</h2></div><Link className="text-link" href="/guide">전체 가이드<ArrowRight size={16} /></Link></div>
          <div className="guide-list">
            {guides.map(([category, title, href]) => <Link className="card guide-card" href={href} key={href}><span className="pill">{category}</span><h3>{title}</h3><span className="text-link">읽어보기<ArrowRight size={15} /></span></Link>)}
          </div>
        </div>
      </section>

      <AdSlot placement="HOME_CONTENT_2" pageType="HOME" monetization="LIMITED" />

      <section className="trust-strip">
        <div className="shell trust-inner">
          <div className="trust-item"><ShieldCheck aria-hidden="true" /><div><strong>공식 정보는 그대로</strong><p>원본 상태와 기준일을 숨기지 않습니다.</p></div></div>
          <div className="trust-item"><BadgeCheck aria-hidden="true" /><div><strong>검증 정보는 근거와 함께</strong><p>24시간·야간 정보에는 출처와 검증일을 둡니다.</p></div></div>
          <div className="trust-item"><ReceiptText aria-hidden="true" /><div><strong>진료비는 지역 통계로</strong><p>개별 병원의 실제 가격처럼 표시하지 않습니다.</p></div></div>
        </div>
      </section>
    </>
  );
}
