import type { RegionalJourneyLink } from "@/lib/regional-journey";
import { NavigationLink } from "@/components/navigation/navigation-link";

export function RegionalJourney({links}:{links:readonly RegionalJourneyLink[]}){
 if(!links.length)return null;
 return <section className="card content-panel regional-journey" aria-labelledby="regional-journey-heading">
  <h2 id="regional-journey-heading">이 지역에서 다음 정보 찾기</h2>
  <p className="quality-note">공개 가능한 실제 데이터가 확인된 페이지만 연결합니다. 상위 지역 정보는 지역명을 구분해 표시합니다.</p>
  <nav className="regional-journey-grid" aria-label="지역 관련 정보">
   {links.map(link=><NavigationLink className="regional-journey-link" key={link.path} href={link.path} prefetch={false}><small>{link.scope==="parent"?"상위 지역 · ":""}{link.regionName}</small><strong>{link.label}</strong></NavigationLink>)}
  </nav>
 </section>;
}
