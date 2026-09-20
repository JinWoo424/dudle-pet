"use client";

import Link,{useLinkStatus} from "next/link";
import type {ComponentProps} from "react";

function PendingMark(){
 const {pending}=useLinkStatus();
 return <span aria-hidden="true" className="navigation-pending" data-pending={pending?"true":"false"}/>;
}

export function NavigationLink({children,...props}:ComponentProps<typeof Link>){
 return <Link {...props}>{children}<PendingMark/></Link>;
}
