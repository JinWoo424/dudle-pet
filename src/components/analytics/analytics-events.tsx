"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/analytics";
export function AnalyticsEvents(){
 const path=usePathname();
 useEffect(()=>{
  const view=()=>{
   if(/^\/(hospital|pharmacy|funeral)\//.test(path)){
    track(/[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(path)?"facility_view":"region_view");
   }
  };
  view();window.addEventListener("dudle-ga-ready",view);
  const click=(event:MouseEvent)=>{
   const anchor=(event.target as Element)?.closest?.("a");
   const href=anchor?.getAttribute("href")??"";
   if(href.startsWith("tel:"))track("call_click");
   else if(href.startsWith("https://map.kakao.com/"))track("direction_click");
   else if(/\/(24h|night|exotic)$/.test(href))track("filter");
  };
  document.addEventListener("click",click);
  return ()=>{window.removeEventListener("dudle-ga-ready",view);document.removeEventListener("click",click);};
 },[path]);
 return null;
}
