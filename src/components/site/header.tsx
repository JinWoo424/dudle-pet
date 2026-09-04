import Link from "next/link";
import { PawPrint } from "lucide-react";

export function Header() {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link className="brand" href="/" aria-label="두들펫 홈">
          <span className="brand-mark"><PawPrint size={20} aria-hidden="true" /></span>
          두들펫
        </Link>
        <nav className="nav-links" aria-label="주요 메뉴">
          <Link href="/hospital">동물병원</Link>
          <Link href="/cost">진료비</Link>
          <Link href="/pharmacy">동물약국</Link>
          <Link href="/funeral">장례시설</Link>
          <Link href="/guide">가이드</Link>
          <Link className="pill" href="/nearby">내 주변</Link>
        </nav>
      </div>
    </header>
  );
}

