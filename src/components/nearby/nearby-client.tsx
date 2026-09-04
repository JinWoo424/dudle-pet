"use client";

import { useState } from "react";
import { LocateFixed } from "lucide-react";

export function NearbyClient() {
  const [status, setStatus] = useState("위치 권한을 허용하면 가까운 시설을 거리순으로 찾습니다.");
  const [radius, setRadius] = useState(3000);
  function locate() {
    if (!navigator.geolocation) return setStatus("이 브라우저에서는 위치 기능을 사용할 수 없습니다. 지역 검색을 이용해 주세요.");
    setStatus("현재 위치를 확인하고 있습니다…");
    navigator.geolocation.getCurrentPosition(
      (position) => setStatus(`위치를 확인했습니다. ${radius / 1000}km 이내 시설 검색 API 연결 준비가 완료되었습니다. (${position.coords.accuracy.toFixed(0)}m 정확도)`),
      () => setStatus("위치 권한이 거부되었습니다. 지역 검색으로 계속 이용할 수 있습니다."),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  }
  return <div className="card content-panel"><div className="nearby-controls" aria-label="검색 반경">{[1000, 3000, 5000].map((value) => <button className={radius === value ? "primary-button" : "secondary-button"} onClick={() => setRadius(value)} key={value}>{value / 1000}km</button>)}</div><p className="nearby-status" role="status">{status}</p><button className="primary-button" onClick={locate}><LocateFixed size={18} />내 위치로 찾기</button></div>;
}

