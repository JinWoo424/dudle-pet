"use client";

import Link,{useLinkStatus} from "next/link";
import {useEffect,useRef,useState,type ComponentProps} from "react";

function PendingMark({activated}:{activated:boolean}){
 const {pending}=useLinkStatus();
 return <span aria-hidden="true" className="navigation-pending" data-pending={pending||activated?"true":"false"}/>;
}

export function NavigationLink({children,onPointerDown,onKeyDown,...props}:ComponentProps<typeof Link>){
 const [activated,setActivated]=useState(false);const timer=useRef<ReturnType<typeof setTimeout>>(undefined);
 const show=()=>{setActivated(true);clearTimeout(timer.current);timer.current=setTimeout(()=>setActivated(false),400);};
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 return <Link {...props} onPointerDown={event=>{show();onPointerDown?.(event);}} onKeyDown={event=>{if(event.key==="Enter"||event.key===" ")show();onKeyDown?.(event);}}>{children}<PendingMark activated={activated}/></Link>;
}
