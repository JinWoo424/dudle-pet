"use client";
import {useState} from "react";
import type {FacilityView} from "@/domain/facility";
import {KakaoMap} from "@/components/map/kakao-map";
import {FacilityCard} from "./facility-card";
import {Fragment, type ReactNode} from "react";
import {HOSPITAL_LIST_AD_AFTER_CARD} from "@/components/ads/ad-placement-policy";
export function FacilityResults({facilities,adSlot}:{facilities:FacilityView[];adSlot?:ReactNode}){
 const [selected,setSelected]=useState<string>();
 function selectFromMap(id:string){setSelected(id);document.getElementById(`facility-${id}`)?.scrollIntoView({block:"nearest",behavior:"smooth"});}
 return <div className="map-list-layout"><aside><KakaoMap facilities={facilities} selectedId={selected} onSelect={selectFromMap}/></aside><div className="facility-list">{facilities.map((f,index)=><Fragment key={f.id}><div id={`facility-${f.id}`} className={selected===f.id?"selected-facility":""}><FacilityCard facility={f}/>{f.latitude!=null&&<button className="secondary-button map-select-button" onClick={()=>setSelected(f.id)} aria-pressed={selected===f.id}>지도에서 선택</button>}</div>{index===HOSPITAL_LIST_AD_AFTER_CARD-1&&adSlot}</Fragment>)}</div></div>;
}
