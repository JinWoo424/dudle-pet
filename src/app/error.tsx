"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section className="shell static-page prose"><span className="eyebrow">Error</span><h1>정보를 불러오지 못했습니다.</h1><p>시설 목록과 지도는 독립적으로 동작합니다. 잠시 뒤 다시 시도해 주세요.</p><button className="primary-button" onClick={reset}>다시 시도</button></section>;
}

