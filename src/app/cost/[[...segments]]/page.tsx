import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { MockNotice } from "@/components/data/mock-notice";
import { listFeeStatistics } from "@/data/repository";
import { formatWon } from "@/lib/format";

type Props = { params: Promise<{ segments?: string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const segments = (await params).segments ?? [];
  const itemCode = segments.length >= 3 ? segments.at(-1) : undefined;
  const stats = await listFeeStatistics(itemCode);
  const item = stats[0]?.itemName;
  return { title: item ? `여수 동물병원 ${item} 비용·진료비 통계` : "여수 동물병원 진료비·가격 통계", description: "공식 조사 기반 지역별 동물병원 진료비의 중간값, 평균, 최저, 최고를 비교하세요.", alternates: { canonical: `/cost/${segments.join("/")}` }, robots: stats.length ? { index: true, follow: true } : { index: false, follow: true } };
}

export default async function CostPage({ params }: Props) {
  const segments = (await params).segments ?? [];
  const itemCode = segments.length >= 3 ? segments.at(-1) : undefined;
  const all = await listFeeStatistics(itemCode);
  const cityRows = (await listFeeStatistics()).filter((item) => item.regionLevel === "CITY");
  if (itemCode) {
    const title = all[0]?.itemName ?? itemCode;
    return <div className="shell listing-page"><Breadcrumbs items={[{ label: "진료비", href: "/cost" }, { label: "여수", href: "/cost/jeonnam/yeosu" }, { label: title }]} /><MockNotice /><div className="listing-header"><div><span className="eyebrow">2025 지역 진료비 통계</span><h1>여수 {title} 비용</h1><p>개별 병원의 가격이 아닌 지역별 공식 조사 통계입니다. 동물 상태와 진료 조건에 따라 실제 비용은 달라질 수 있습니다.</p></div></div><div className="comparison-grid">{all.map((stat) => <div className="card comparison-card" key={stat.regionLevel}><span className="eyebrow">{stat.region}</span><strong>{formatWon(stat.medianPrice)}</strong><span className="muted">중간값 · 표본 {stat.sampleCount ?? "미공개"}</span></div>)}</div><section className="card content-panel" style={{ marginTop: "1rem" }}><div className="cost-table-wrap"><table className="cost-table"><thead><tr><th>지역</th><th>최저</th><th>중간값</th><th>평균</th><th>최고</th></tr></thead><tbody>{all.map((stat) => <tr key={stat.regionLevel}><td>{stat.region}</td><td>{formatWon(stat.minimumPrice)}</td><td><strong>{formatWon(stat.medianPrice)}</strong></td><td>{formatWon(stat.averagePrice)}</td><td>{formatWon(stat.maximumPrice)}</td></tr>)}</tbody></table></div></section><p className="quality-note">출처: {all[0]?.sourceName ?? "공식 데이터 연결 대기"} · 조사연도 {all[0]?.surveyYear ?? "-"}</p><Link className="primary-button" href="/hospital/jeonnam/yeosu">여수 동물병원 찾기</Link></div>;
  }
  return <div className="shell listing-page"><Breadcrumbs items={[{ label: "진료비" }]} /><MockNotice /><div className="listing-header"><div><span className="eyebrow">Regional cost data</span><h1>동물병원 진료비 통계</h1><p>공식 지역 통계의 중간값·평균·최저·최고를 확인하세요. 0원이 아닌 자료 없음은 별도로 표시합니다.</p></div></div><div className="card content-panel cost-table-wrap"><table className="cost-table"><thead><tr><th>진료 항목</th><th>최저</th><th>중간값</th><th>평균</th><th>최고</th></tr></thead><tbody>{cityRows.map((stat) => <tr key={stat.itemCode}><td><Link className="text-link" href={`/cost/jeonnam/yeosu/${stat.itemCode}`}>{stat.itemName}</Link></td><td>{formatWon(stat.minimumPrice)}</td><td><strong>{formatWon(stat.medianPrice)}</strong></td><td>{formatWon(stat.averagePrice)}</td><td>{formatWon(stat.maximumPrice)}</td></tr>)}</tbody></table></div></div>;
}
