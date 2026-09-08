import Link from "next/link";
import { Menu, PawPrint } from "lucide-react";

const links = [
  ["동물병원", "/hospital"], ["진료비", "/cost"], ["동물약국", "/pharmacy"],
  ["장례시설", "/funeral"], ["가이드", "/guide"], ["내 주변", "/nearby"],
];

export function Header() {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link className="brand" href="/" aria-label="두들펫 홈">
          <span className="brand-mark"><PawPrint size={20} aria-hidden="true" /></span>
          두들펫
        </Link>
        <nav className="nav-links" aria-label="주요 메뉴">{links.map(([label,href])=><Link className={href==="/nearby"?"pill":undefined} href={href} key={href} prefetch={false}>{label}</Link>)}</nav>
        <details className="mobile-nav">
          <summary aria-label="메뉴 열기"><Menu size={22} aria-hidden="true"/></summary>
          <nav aria-label="모바일 주요 메뉴">{links.map(([label,href])=><Link href={href} key={href} prefetch={false}>{label}</Link>)}</nav>
        </details>
      </div>
    </header>
  );
}

