"use client";
import { useRef, useState } from "react";
import { LocateFixed } from "lucide-react";
import { FacilityResults } from "@/components/facility/facility-results";
import type { FacilityView } from "@/domain/facility";
import { track } from "@/lib/analytics";
export function NearbyClient() {
 const [status,setStatus]=useState("위치 권한을 허용하면 가까운 시설을 직선거리순으로 찾습니다.");
 const [radius,setRadius]=useState(3000);const [type,setType]=useState("ANIMAL_HOSPITAL");
 const [rows,setRows]=useState<FacilityView[]>([]);const [busy,setBusy]=useState(false);
 const generation=useRef(0);
 function locate() {
  track("nearby");
  if(!navigator.geolocation) return setStatus("위치 기능을 사용할 수 없습니다. 지역 검색을 이용해 주세요.");
  const requestId=++generation.current;setBusy(true);setStatus("현재 위치를 확인하고 있습니다…");setRows([]);
  navigator.geolocation.getCurrentPosition(async position=>{
   try {
    const response=await fetch("/api/nearby",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({latitude:position.coords.latitude,longitude:position.coords.longitude,radiusMeters:radius,type:type==="24h"?"ANIMAL_HOSPITAL":type,feature:type==="24h"?"24h":undefined}),signal:AbortSignal.timeout(15000)});
    if(!response.ok) throw new Error();
    const data=await response.json();
    if(requestId!==generation.current) return;
    setRows(data.facilities);setStatus(data.facilities.length?`${radius/1000}km 내 ${data.facilities.length}개 시설 · 직선거리 기준`:"해당 반경에서 확인된 시설이 없습니다. 반경이나 종류를 변경해 주세요.");
   }catch{if(requestId===generation.current)setStatus("현재 시설 정보를 불러오지 못했습니다. 지역 검색을 이용하거나 잠시 뒤 다시 시도해 주세요.");}
   finally{if(requestId===generation.current)setBusy(false);}
  },()=>{if(requestId===generation.current){setBusy(false);setStatus("위치를 확인할 수 없습니다. 권한을 확인하거나 지역 검색을 이용해 주세요.");}},{enableHighAccuracy:false,timeout:8000,maximumAge:60000});
 }
 return <><div className="card content-panel"><div className="nearby-controls" aria-label="검색 반경">{[1000,3000,5000].map(value=><button disabled={busy} className={radius===value?"primary-button":"secondary-button"} onClick={()=>setRadius(value)} key={value}>{value/1000}km</button>)}</div><label htmlFor="nearby-type">시설 종류 </label><select id="nearby-type" disabled={busy} value={type} onChange={e=>setType(e.target.value)}><option value="ANIMAL_HOSPITAL">동물병원</option><option value="ANIMAL_PHARMACY">동물약국</option><option value="PET_FUNERAL">장례시설</option><option value="24h">확인된 24시간 병원</option></select><p role="status" className="nearby-status">{status}</p><button disabled={busy} className="primary-button" onClick={locate}><LocateFixed size={18}/>{busy?"조회 중…":"내 위치로 찾기"}</button><p className="quality-note">위치는 이번 검색에만 사용하며 저장하지 않습니다. 이동 경로의 거리는 길찾기에서 확인하세요.</p></div>{rows.length>0&&<FacilityResults facilities={rows}/>}</>;
}
