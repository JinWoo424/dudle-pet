export type AnalyticsEvent = "search" | "region_view" | "facility_view" | "call_click" | "direction_click" | "nearby" | "filter" | "user_report" | "region_nav_click" | "hospital_click" | "pharmacy_click" | "funeral_click" | "fee_click" | "fee_compare" | "related_content_click" | "phone_click" | "map_click" | "filter_change";
import {officialFeeItemByCode} from "@/data/fee-catalog";
export type Placement="header"|"hero"|"region_nav"|"content"|"related"|"bottom";
export type EventContext={page_type?:string;source_page?:string;target_type?:string;region?:string;facility_id?:string;fee_item?:string;placement?:Placement;result_count?:number};
export function pageContext(raw:string):EventContext {
 const path=raw.split(/[?#]/)[0];
 if(!/^\/(?:[a-z0-9-]+\/)*[a-z0-9-]*$/.test(path))return {source_page:"/",page_type:"other"};
 const [category,...segments]=path.split('/').filter(Boolean);
 const supported=['hospital','pharmacy','funeral','cost','guide','search','nearby'];
 if(category&&!supported.includes(category))return {source_page:"/",page_type:"other"};
 const id=segments.at(-1),isId=Boolean(id&&/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(id));
 const feeItem=category==='cost'&&id&&officialFeeItemByCode.has(id)?id:undefined;
 const regionParts=segments.slice(0,isId||feeItem?-1:undefined);
 return {source_page:path,page_type:category?(isId?`${category}_detail`:category):"home",...(isId?{facility_id:id}:{}),...(feeItem?{fee_item:feeItem}:{}),...(['hospital','pharmacy','funeral','cost'].includes(category)&&regionParts.length?{region:regionParts.join('/')}:{} )};
}
export function safeEventContext(context:EventContext):Record<string,string|number> {
 const result:Record<string,string|number>={};
 for(const key of ['page_type','target_type','region','facility_id','fee_item','placement'] as const){const value=context[key];if(value&&/^[a-z0-9_/-]{1,100}$/.test(value))result[key]=value;}
 if(context.source_page)result.source_page=pageContext(context.source_page).source_page!;
 if(Number.isInteger(context.result_count)&&context.result_count!>=0)result.result_count=context.result_count!;
 return result;
}
export function track(event: AnalyticsEvent, context:EventContext={}) {
 if(typeof window==='undefined')return;
 const gtag=(window as Window & {gtag?:(...args:unknown[])=>void}).gtag;
 const safe=safeEventContext({...pageContext(window.location.pathname),...context});
 // Never transmit search text, query strings, phone/email, coordinates or form content.
 gtag?.('event',event,{...safe,page_location:window.location.origin+(safe.source_page??'/'),page_title:'Dudle Pet'});
}
