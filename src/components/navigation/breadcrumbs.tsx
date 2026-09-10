import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { safeJson } from "@/lib/facility-display";

export function Breadcrumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
  const base=(process.env.NEXT_PUBLIC_SITE_URL||"https://pet.dudle.co.kr").replace(/\/$/,"");
  const all=[{label:"홈",href:"/"},...items];
  const structured={"@context":"https://schema.org","@type":"BreadcrumbList",itemListElement:all.map((item,index)=>({"@type":"ListItem",position:index+1,name:item.label,...(item.href?{item:new URL(item.href,base).href}:{})}))};
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:safeJson(structured)}}/><nav className="breadcrumbs" aria-label="현재 위치"><ol><li><Link href="/">홈</Link></li>{items.map((item) => <li key={`${item.href}-${item.label}`}><ChevronRight size={14} aria-hidden="true" />{item.href ? <Link href={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}</li>)}</ol></nav></>;
}

