import Link from "next/link";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="shell footer-inner">
        <div>
          <strong>두들펫</strong>
          <p className="disclaimer">두들펫은 공개·확인된 시설 정보를 제공하는 정보 서비스입니다. 응급상황 또는 진료 가능 여부는 해당 병원에 직접 확인하세요.</p>
          <p className="disclaimer">© {new Date().getFullYear()} Dudle Pet</p>
        </div>
        <div className="footer-nav-groups">
          <nav className="footer-links" aria-label="서비스 메뉴"><strong>서비스</strong><Link href="/hospital">동물병원</Link><Link href="/pharmacy">동물약국</Link><Link href="/cost">진료비</Link></nav>
          <nav className="footer-links" aria-label="정책 메뉴"><strong>정책</strong><Link href="/about">서비스 소개</Link><Link href="/contact">문의</Link><Link href="/data-policy">데이터 정책</Link><Link href="/privacy">개인정보처리방침</Link><Link href="/terms">이용약관</Link></nav>
          <div className="footer-source"><strong>출처</strong><span>공공데이터포털 · 행정안전부</span><span>농림축산식품부 공식 자료</span></div>
        </div>
      </div>
    </footer>
  );
}

