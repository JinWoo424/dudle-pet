import type { Metadata } from "next";

export function shareMetadata(title:string,description:string,canonical:string):Pick<Metadata,"openGraph"|"twitter">{
 return {
  openGraph:{type:"website",locale:"ko_KR",siteName:"두들펫",title,description,url:canonical,images:[{url:"/images/pet-map-hero.png",alt:"두들펫 반려동물 시설 지도"}]},
  twitter:{card:"summary_large_image",title,description,images:["/images/pet-map-hero.png"]},
 };
}
