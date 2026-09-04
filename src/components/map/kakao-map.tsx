"use client";

import Script from "next/script";
import { useEffect, useId, useState } from "react";
import type { FacilityView } from "@/domain/facility";

declare global {
  interface Window {
    kakao?: { maps: { load(callback: () => void): void; Map: new (node: HTMLElement, options: unknown) => unknown; LatLng: new (lat: number, lng: number) => unknown; Marker: new (options: unknown) => { setMap(map: unknown): void } } };
  }
}

export function KakaoMap({ facilities }: { facilities: FacilityView[] }) {
  const id = useId().replaceAll(":", "");
  const key = process.env.NEXT_PUBLIC_KAKAO_MAP_JS_KEY;
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const center = facilities.find((item) => item.latitude && item.longitude);

  useEffect(() => {
    if (!ready || !center || !window.kakao) return;
    window.kakao.maps.load(() => {
      const node = document.getElementById(id);
      if (!node || !window.kakao) return;
      const map = new window.kakao.maps.Map(node, { center: new window.kakao.maps.LatLng(center.latitude!, center.longitude!), level: 7 });
      facilities.filter((item) => item.latitude && item.longitude).forEach((item) => new window.kakao!.maps.Marker({ position: new window.kakao!.maps.LatLng(item.latitude!, item.longitude!), title: item.name }).setMap(map));
    });
  }, [center, facilities, id, ready]);

  if (!key) return <div className="map-placeholder"><strong>지도 연결 대기 중</strong><span>Kakao JavaScript 키를 설정하면 이 위치에 지도가 표시됩니다.</span></div>;
  return (
    <>
      <Script src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&autoload=false`} strategy="lazyOnload" onLoad={() => setReady(true)} onError={() => setFailed(true)} />
      <div id={id} className="map-frame" role="region" aria-label="시설 위치 지도">{failed && <p>지도를 불러오지 못했습니다. 목록은 계속 이용할 수 있습니다.</p>}</div>
    </>
  );
}

