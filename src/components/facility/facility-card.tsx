import Link from "next/link";
import {MapPin,Navigation,Phone} from "lucide-react";
import type {FacilityView} from "@/domain/facility";
import {formatDistance} from "@/lib/format";
import {facilityPath,statusLabels,directionsUrl} from "@/lib/facility-display";
export function FacilityCard({facility:f,compact=false}:{facility:FacilityView;compact?:boolean}){
 const path=facilityPath(f); const tags=f.features.verificationStatus==="VALID"?[f.features.open24h==="YES"&&"24시간 확인",f.features.nightService==="YES"&&"야간 진료",f.features.exoticService==="YES"&&"특수동물",f.features.catService==="YES"&&"고양이",f.features.parkingAvailable==="YES"&&"주차"].filter(Boolean):[];
 return <article className={`card facility-card${compact?" compact":""}`}><div className="facility-card-top"><div><span className="status-open">{statusLabels[f.businessStatus]}</span><h2>{path?<Link href={path}>{f.name}</Link>:f.name}</h2></div>{f.distanceMeters!=null&&<strong className="distance">{formatDistance(f.distanceMeters)}<small> 직선거리</small></strong>}</div>
 <p className="address"><MapPin size={16}/>{f.roadAddress||"주소 정보 미확인"}</p>
 {tags.length?<div className="tag-row">{tags.map(tag=><span className="pill" key={String(tag)}>{tag}</span>)}</div>:<p className="unverified">부가 운영정보 미확인</p>}
 {tags.length>0&&<p className="quality-note">확인일: {f.features.verifiedAt??"미확인"}</p>}
 <div className="facility-actions">{f.phone?<a href={`tel:${f.phone}`}><Phone size={16}/>전화</a>:<span>전화 미확인</span>}{f.roadAddress&&<a href={directionsUrl(f)} target="_blank" rel="noreferrer"><Navigation size={16}/>길찾기</a>}{path&&<Link className="detail-link" href={path}>상세보기</Link>}</div></article>;
}
