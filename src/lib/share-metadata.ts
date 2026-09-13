import type {Metadata} from "next";

/** Sharing tags reuse the page's existing editorial title, description and canonical. */
export function shareMetadata(title:string,description:string,canonical:string):Metadata['openGraph'] {
 const url=new URL(canonical,'https://pet.dudle.co.kr');
 if(url.origin!=='https://pet.dudle.co.kr')throw new Error('Invalid share canonical origin');
 url.search='';url.hash='';
 return {type:'website',siteName:'두들펫',locale:'ko_KR',title,description,url:url.href,images:[{url:'https://pet.dudle.co.kr/images/pet-map-hero.png',alt:'두들펫 반려동물 시설 정보'}]};
}
