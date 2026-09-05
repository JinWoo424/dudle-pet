import { adminConfigured, createAdminSession, verifyPassword } from "@/lib/admin-auth";
import { limitedForm, persistentRateLimit, sameOrigin } from "@/lib/request-security";
export async function POST(request:Request){
 if(!sameOrigin(request))return new Response("Invalid origin",{status:403});
 if(!adminConfigured())return new Response("관리자 설정이 필요합니다.",{status:503});
 try{
  if(!await persistentRateLimit(request,"login",5,15*60000))return new Response("Too many attempts",{status:429});
  const form=await limitedForm(request);
  const email=String(form.email??"");const password=String(form.password??"");
  if(email!==process.env.ADMIN_EMAIL||!verifyPassword(password,process.env.ADMIN_PASSWORD_HASH!))return new Response("로그인 정보가 올바르지 않습니다.",{status:401});
  return new Response(null,{status:303,headers:{Location:new URL("/admin",request.url).href,"Cache-Control":"no-store","Set-Cookie":`dudle_admin=${createAdminSession(email)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${process.env.NODE_ENV==="production"?"; Secure":""}`}});
 }catch{return new Response("로그인을 처리하지 못했습니다. 관리자 DB 설정을 확인하세요.",{status:503});}
}
