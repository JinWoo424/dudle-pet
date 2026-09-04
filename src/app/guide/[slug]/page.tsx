import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { guideEntries } from "@/content/guides";

type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return guideEntries.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { slug } = await params; const guide = guideEntries.find((item) => item.slug === slug); return guide ? { title: guide.title, description: guide.summary } : {}; }
export default async function GuideDetailPage({ params }: Props) { const { slug } = await params; const guide = guideEntries.find((item) => item.slug === slug); if (!guide) notFound(); return <article className="shell static-page prose"><Breadcrumbs items={[{ label: "가이드", href: "/guide" }, { label: guide.title }]} /><span className="pill">{guide.category}</span><h1>{guide.title}</h1><p>{guide.summary}</p>{guide.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}<h2>꼭 기억하세요</h2><p>두들펫은 수의학적 진단이나 치료를 제공하지 않습니다. 응급상황 또는 진료 가능 여부는 해당 병원에 직접 확인하세요.</p></article>; }
