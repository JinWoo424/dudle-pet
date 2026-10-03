import Link from "next/link";
import type { Metadata } from "next";
import { regionDirectory } from "@/data/region-directory";
import { isPreviewDeployment } from "@/lib/deployment";
import { shareMetadata } from "@/lib/metadata";

const title = "전국 지역별 동물병원·동물약국·장례식장·진료비 찾기";
const description = "시·도와 시·군·구별 공개된 동물병원, 동물약국, 반려동물 장례식장과 공식 진료비 통계를 찾으세요. 검증된 지역 안내만 연결합니다.";

export async function generateMetadata(): Promise<Metadata> {
  const groups = await regionDirectory();
  return { title, description, alternates: { canonical: "/regions" },
    ...shareMetadata(title, description, "/regions"),
    robots: { index: !isPreviewDeployment() && groups.length > 0, follow: !isPreviewDeployment() },
  };
}

export default async function RegionsPage() {
  const groups = await regionDirectory();
  return <article className="shell static-page">
    <nav className="breadcrumb" aria-label="현재 위치"><Link href="/">홈</Link><span> / 전국 지역 안내</span></nav>
    <h1>전국 지역별 반려동물 시설과 진료비</h1>
    <p>거주하거나 방문할 지역을 선택해 동물병원·동물약국·장례식장과 공식 진료비 통계를 확인하세요. 공개 기준을 통과한 지역 페이지만 안내합니다.</p>
    <p>시설의 실제 진료 가능 여부와 약품 재고, 장례 절차는 방문 전에 직접 확인하세요. 진료비는 개별 병원의 견적이 아닌 공식 지역 통계입니다.</p>
    <nav className="chip-list" aria-label="시·도 바로가기">{groups.map(group => <a className="chip-link" href={`#region-${group.slug}`} key={group.slug}>{group.name}</a>)}</nav>
    {groups.length === 0 && <p>현재 공개 기준을 충족한 지역 안내가 없습니다.</p>}
    {groups.map(group => <section className="section" id={`region-${group.slug}`} key={group.slug} aria-labelledby={`heading-${group.slug}`}>
      <h2 id={`heading-${group.slug}`}>{group.name}</h2>
      <ul className="region-directory-links">{group.links.map(link => <li key={link.href}><Link href={link.href} prefetch={false}>{link.label}</Link></li>)}</ul>
    </section>)}
  </article>;
}
