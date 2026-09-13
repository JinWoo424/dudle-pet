"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track,pageContext,type Placement,type AnalyticsEvent } from "@/lib/analytics";
export function AnalyticsEvents(){
 const path=usePathname();
 useEffect(()=>{
  const view=()=>{
   if(/^\/(hospital|pharmacy|funeral)\//.test(path)){
    track(/[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(path)?"facility_view":"region_view");
   }
  };
  view();window.addEventListener("dudle-ga-ready",view);
  const placement=(element:Element):Placement=>{
   const explicit=element.closest('[data-analytics-placement]')?.getAttribute('data-analytics-placement');
   if(explicit&&['header','hero','region_nav','content','related','bottom'].includes(explicit))return explicit as Placement;
   return element.closest('header')?'header':element.closest('footer')?'bottom':element.closest('.hero')?'hero':element.closest('nav')?'region_nav':'content';
  };
  const click=(event:MouseEvent)=>{
   if(!(event.target instanceof Element))return;
   const element=event.target,anchor=element.closest('a');
   const context={...pageContext(path),placement:placement(element)};
   if(element.closest('summary')?.parentElement?.matches('[data-analytics-event="fee_compare"]')&&!element.closest('details')?.open)
    track('fee_compare',{...context,fee_item:element.closest('[data-fee-item]')?.getAttribute('data-fee-item')??undefined});
   if(!anchor)return;
   const href=anchor.getAttribute('href')??'';
   if(href.startsWith('tel:')){track('phone_click',context);return;}
   if(href.startsWith('https://map.kakao.com/')){track('map_click',context);return;}
   const url=new URL(href,window.location.origin);if(url.origin!==window.location.origin||url.pathname===path)return;
   const target=pageContext(url.pathname),category=url.pathname.split('/')[1];
   const events:Record<string,AnalyticsEvent>={hospital:'hospital_click',pharmacy:'pharmacy_click',funeral:'funeral_click',cost:'fee_click'};
   const next={...context,target_type:target.page_type,facility_id:target.facility_id,region:target.region,fee_item:target.fee_item};
   if(events[category])track(events[category],next);
   if(context.placement==='related')track('related_content_click',next);
   if(!target.facility_id&&target.region)track('region_nav_click',next);
  };
  const change=(event:Event)=>{if(event.target instanceof HTMLSelectElement)track('filter_change',{...pageContext(path),placement:placement(event.target)});};
  document.addEventListener('change',change);
  document.addEventListener("click",click);
  return ()=>{window.removeEventListener("dudle-ga-ready",view);document.removeEventListener("click",click);document.removeEventListener('change',change);};
 },[path]);
 return null;
}
