import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { FacilityDetail } from "./facility-detail";
import { FacilityResults } from "./facility-results";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { MockNotice } from "@/components/data/mock-notice";
import { getFacility, queryFacilities, resolveRegion, listRegions, isMockMode } from "@/data/repository";
import { parseFacilityRoute } from "@/lib/regions";
import { facilityPath, typePaths } from "@/lib/facility-display";
import type { FacilityKind } from "@/domain/facility";
import { seoApproved, relatedSeoLinks } from "@/data/seo-repository";
import { previewRobotsPolicy } from "@/lib/deployment";
import { cache } from "react";
import { AdSlot } from "@/components/ads/ad-slot";
import { PHARMACY_LIST_AD_AFTER_CARD, shouldInsertHospitalListAd, shouldInsertPharmacyListAd } from "@/components/ads/ad-placement-policy";
import type { PageType } from "@/lib/seo";

export const directoryConfig = {
 ANIMAL_HOSPITAL:{ label:"동물병원", minimum:5 },
 ANIMAL_PHARMACY:{ label:"동물약국", minimum:5 },
 PET_FUNERAL:{ label:"반려동물 장례시설", minimum:2 },
};
export type DirectoryProps = { params:Promise<{segments?:string[]}>; searchParams:Promise<Record<string,string|string[]|undefined>> };
async function loadDirectoryUncached(type:FacilityKind, segments:string[], query:Record<string,string|string[]|undefined>) {
 const route=parseFacilityRoute(segments); if(!route) notFound();
 if(route.feature && type!=="ANIMAL_HOSPITAL") notFound();
 const region=route.fullSlug ? await resolveRegion(route.fullSlug):null;
 if(route.fullSlug && !region) notFound();
 if(region&&route.fullSlug!==region.fullSlug){
  const tail=route.feature??route.id;
  permanentRedirect(`/${typePaths[type]}/${region.fullSlug}${tail?`/${tail}`:""}`);
 }
 if(route.id){
  const facility=await getFacility(route.id);
  if(!facility || facility.type!==type || facility.regionSlug!==route.fullSlug) notFound();
  return {route,region,facility,result:null};
 }
 const result=await queryFacilities({type,regionSlug:route.fullSlug||undefined,feature:route.feature,page:Number(query.page)||1,sort:typeof query.sort==="string"?query.sort:undefined});
 return {route,region,facility:null,result};
}
const loadDirectoryCached=cache(async(type:FacilityKind,segmentsKey:string,page:string|undefined,sort:string|undefined)=>
 loadDirectoryUncached(type,segmentsKey?segmentsKey.split("/"):[],{page,sort}));
export function loadDirectory(type:FacilityKind,segments:string[],query:Record<string,string|string[]|undefined>={}){
 const page=Array.isArray(query.page)?query.page.join(","):query.page;
 const sort=typeof query.sort==="string"?query.sort:undefined;
 return loadDirectoryCached(type,segments.join("/"),page,sort);
}
export async function directoryMetadata(type:FacilityKind,segments:string[],query:Record<string,string|string[]|undefined>={}):Promise<Metadata>{
 const data=await loadDirectory(type,segments,query); const {label,minimum}=directoryConfig[type];
 const region=data.region?.shortName??"전국"; const feature=data.route.feature?({"24h":"24시간",night:"야간",exotic:"특수동물"}[data.route.feature])+" ":"";
 const title=data.facility?`${data.facility.name} - ${region} ${label} 위치·전화`:`${region} ${feature}${label} 위치·전화·진료정보 찾기`;
 const ready=data.facility?Boolean(data.facility.name&&data.facility.roadAddress&&data.facility.regionSlug&&data.facility.businessStatus!=="UNKNOWN"):(data.result?.total??0)>=(data.route.feature==="24h"?2:data.route.feature?3:minimum);
 const canonical=data.facility?facilityPath(data.facility)!:`/${typePaths[type]}${segments.length?"/"+segments.join("/"):""}`;
 return {title,description:`${region} ${label}의 공식 등록상태와 출처, 위치, 전화번호를 확인하세요.`,alternates:{canonical},robots:previewRobotsPolicy()??{index:!isMockMode()&&ready&&!Object.keys(query).length&&await seoApproved(canonical),follow:true}};
}
export async function FacilityDirectory({type,segments,query={}}:{type:FacilityKind;segments:string[];query?:Record<string,string|string[]|undefined>}){
 const {route,region,facility,result}=await loadDirectory(type,segments,query);
 if(facility) return <FacilityDetail facility={facility} typeLabel={directoryConfig[type].label} typePath={typePaths[type]} />;
 const name=region?.shortName??"전국"; const feature=route.feature?{"24h":"24시간",night:"야간",exotic:"특수동물"}[route.feature]:"";
 const base=`/${typePaths[type]}${route.fullSlug?"/"+route.fullSlug:""}`;
 const children=(await listRegions()).filter(r=>region?r.parentId===region.id:!r.parentId);
 const synced=result!.facilities.map(f=>f.syncedAt).filter(Boolean).sort().at(-1);
 const related=region?await relatedSeoLinks(region.fullSlug):[];
 const pageType:PageType=type==="ANIMAL_HOSPITAL"?(route.feature==="24h"?"HOSPITAL_24H":route.feature==="night"?"HOSPITAL_NIGHT":route.feature==="exotic"?"HOSPITAL_EXOTIC":"HOSPITAL_REGION"):type==="ANIMAL_PHARMACY"?"PHARMACY_REGION":"FUNERAL_REGION";
 const hasListAd=type==="ANIMAL_HOSPITAL"
  ?shouldInsertHospitalListAd(result!.total,result!.facilities.length)
  :type==="ANIMAL_PHARMACY"&&shouldInsertPharmacyListAd(result!.total,result!.facilities.length);
 const adSlot=hasListAd
  ?<AdSlot placement={type==="ANIMAL_PHARMACY"?"PHARMACY_LIST_1":"HOSPITAL_LIST_1"} pageType={pageType} monetization="FULL"/>
  :null;
 return <div className="shell listing-page">
 <Breadcrumbs items={[{label:directoryConfig[type].label,href:`/${typePaths[type]}`},...(region?[{label:region.name}]:[])]}/><MockNotice/>
 <div className="listing-header"><div><h1>{name} {feature} {directoryConfig[type].label}</h1><p>{feature?"출처와 확인일이 있고 유효기간이 지나지 않은 검증정보만 표시합니다. 방문 전 전화로 진료 가능 여부를 확인하세요.":"공식 등록상 영업 시설입니다. 현재 시간의 실제 영업 여부는 시설에 직접 확인하세요."}</p><p className="quality-note">공식정보 출처: 공공데이터포털 / 행정안전부 · 최종 동기화: {synced??"확인된 데이터 없음"}</p></div><div className="count-box"><strong>{result!.total}</strong><span>공식 등록상 영업 시설</span></div></div>
 {children.length>0&&<div className="chip-list">{children.map(r=><Link className="chip-link" href={`/${typePaths[type]}/${r.fullSlug}`} key={r.id} prefetch={false}>{r.name}</Link>)}</div>}
 <div className="filter-bar"><Link href={base} prefetch={false}>전체</Link>{type==="ANIMAL_HOSPITAL"&&(["24h","night","exotic"] as const).map(f=><Link key={f} className={route.feature===f?"active":""} href={`${base}/${f}`} prefetch={false}>{{"24h":"24시간",night:"야간",exotic:"특수동물"}[f]}</Link>)}<Link href={`?sort=${query.sort==="name"?"quality":"name"}`} prefetch={false}>{query.sort==="name"?"정보 충실도순":"가나다순"}</Link></div>
 <FacilityResults facilities={result!.facilities} adSlot={adSlot} adAfterCard={type==="ANIMAL_PHARMACY"?PHARMACY_LIST_AD_AFTER_CARD:undefined}/>
 {!result!.total&&<p>현재 두들펫에서 확인된 {name} {feature} {directoryConfig[type].label}이 없습니다. <Link className="text-link" href={base}>전체 시설 보기</Link></p>}
 <nav className="chip-list" aria-label="페이지">{result!.page>1&&<Link className="chip-link" href={`?page=${result!.page-1}&sort=${query.sort==="name"?"name":"quality"}`} prefetch={false}>이전</Link>}{result!.page*30<result!.total&&<Link className="chip-link" href={`?page=${result!.page+1}&sort=${query.sort==="name"?"name":"quality"}`} prefetch={false}>다음</Link>}</nav>
 {related.length>0&&<nav className="chip-list" aria-label="지역 관련 정보">{related.map(link=><Link className="chip-link" href={link.path} key={link.path} prefetch={false}>{name} {link.label}</Link>)}</nav>}
 </div>;
}
