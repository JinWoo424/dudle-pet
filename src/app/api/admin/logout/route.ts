import { sameOrigin } from "@/lib/request-security";
export async function POST(request:Request){
 if(!sameOrigin(request))return new Response("Invalid origin",{status:403});
 return new Response(null,{status:303,headers:{Location:new URL("/admin",request.url).href,"Set-Cookie":`dudle_admin=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${process.env.NODE_ENV==="production"?"; Secure":""}`}});
}
