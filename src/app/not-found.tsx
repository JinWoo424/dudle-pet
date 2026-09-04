import Link from "next/link";

export default function NotFound() {
  return <section className="shell static-page prose"><span className="eyebrow">404</span><h1>찾으시는 페이지가 없어요.</h1><p>주소가 바뀌었거나 아직 공개할 만큼 데이터가 충분하지 않은 페이지일 수 있습니다.</p><Link className="primary-button" href="/">홈으로 돌아가기</Link></section>;
}

