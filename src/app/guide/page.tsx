import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { guideEntries } from "@/content/guides";

export const metadata: Metadata = { title: "반려생활 가이드", description: "동물병원, 동물약국, 장례시설과 진료비 정보를 안전하게 확인하는 방법을 안내합니다." };
export default function GuidePage() { return <div className="shell listing-page"><div className="listing-header"><div><span className="eyebrow">Guide</span><h1>반려생활 가이드</h1><p>가기 전에 확인하면 좋은 실용 정보만 간결하게 정리했습니다.</p></div></div><div className="guide-list">{guideEntries.map((guide) => <Link className="card guide-card" href={`/guide/${guide.slug}`} key={guide.slug}><span className="pill">{guide.category}</span><h2>{guide.title}</h2><p className="muted">{guide.summary}</p><span className="text-link">읽어보기<ArrowRight size={15} /></span></Link>)}</div></div>; }

