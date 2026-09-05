"use client";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import type { FacilityView } from "@/domain/facility";
interface MapInstance { setBounds(bounds: unknown): void; panTo(position: unknown): void }
interface MarkerInstance { setMap(map: MapInstance | null): void; setZIndex(index: number): void }
declare global { interface Window { kakao?: { maps: {
 load(callback: () => void): void;
 Map: new(node: HTMLElement, options: unknown) => MapInstance;
 LatLng: new(lat: number,lng: number) => unknown;
 LatLngBounds: new() => { extend(point: unknown): void };
 Marker: new(options: unknown) => MarkerInstance;
 event: { addListener(target: unknown,event: string,handler: () => void): void; removeListener(target: unknown,event: string,handler: () => void): void };
} } } }
export function KakaoMap({ facilities, selectedId, onSelect }: { facilities: FacilityView[]; selectedId?: string; onSelect?: (id:string)=>void }) {
 const node = useRef<HTMLDivElement>(null);
 const current = useRef<MapInstance | null>(null);
 const markers = useRef(new Map<string, { marker:MarkerInstance; point:unknown }>());
 const select = useRef(onSelect);
 useEffect(()=>{ select.current=onSelect; },[onSelect]);
 const [ready,setReady]=useState(false); const [failed,setFailed]=useState(false);
 const key=process.env.NEXT_PUBLIC_KAKAO_MAP_JS_KEY;
 const valid=facilities.filter(f=>Number.isFinite(f.latitude)&&Number.isFinite(f.longitude));
 useEffect(()=>{
  if(!ready||!node.current||!window.kakao) return;
  let cancelled=false; const disposers:Array<()=>void>=[];
  window.kakao.maps.load(()=>{
   if(cancelled||!node.current||!window.kakao) return;
   const maps=window.kakao.maps;
   const rows=facilities.filter(f=>Number.isFinite(f.latitude)&&Number.isFinite(f.longitude));
   if(!rows.length) return;
   const map=new maps.Map(node.current,{center:new maps.LatLng(rows[0].latitude!,rows[0].longitude!),level:5});
   current.current=map; const bounds=new maps.LatLngBounds();
   for(const f of rows) {
    const point=new maps.LatLng(f.latitude!,f.longitude!);
    const marker=new maps.Marker({map,position:point,title:f.name});
    const click=()=>select.current?.(f.id);
    maps.event.addListener(marker,"click",click);
    markers.current.set(f.id,{marker,point}); bounds.extend(point);
    disposers.push(()=>{maps.event.removeListener(marker,"click",click);marker.setMap(null);});
   }
   if(rows.length>1) map.setBounds(bounds);
  });
  const collection=markers.current;
  return ()=>{cancelled=true;disposers.forEach(fn=>fn());collection.clear();current.current=null;};
 },[ready,facilities]);
 useEffect(()=>{
  const entry=selectedId?markers.current.get(selectedId):undefined;
  markers.current.forEach(({marker},id)=>marker.setZIndex(id===selectedId?10:0));
  if(entry) current.current?.panTo(entry.point);
 },[selectedId]);
 if(!valid.length) return <div className="map-placeholder"><strong>표시할 좌표가 없습니다</strong><span>좌표가 없는 시설도 목록에서 확인할 수 있습니다.</span></div>;
 if(!key) return <div className="map-placeholder"><strong>지도 연결 대기 중</strong><span>목록과 길찾기 링크를 이용해 주세요.</span></div>;
 return <><Script id="kakao-maps-sdk" src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false`} strategy="lazyOnload" onReady={()=>setReady(true)} onError={()=>setFailed(true)}/>{failed?<div className="map-placeholder">지도를 불러오지 못했습니다. 목록은 계속 이용할 수 있습니다.</div>:<div ref={node} className="map-frame" role="region" aria-label="시설 위치 지도"/>}</>;
}
