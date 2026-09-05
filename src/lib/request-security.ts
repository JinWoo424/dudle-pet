import { createHmac } from "node:crypto";
import { getSql } from "@/db/connection";
export function sameOrigin(request:Request){
 const origin=request.headers.get("origin");
 try{return Boolean(origin&&new URL(origin).origin===new URL(request.url).origin);}catch{return false;}
}
export async function limitedForm(request:Request,maxBytes=8192){
 if(Number(request.headers.get("content-length")??0)>maxBytes)throw new Error("INPUT_TOO_LARGE");
 if(!request.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded"))throw new Error("INVALID_CONTENT_TYPE");
 const text=await request.text();if(Buffer.byteLength(text)>maxBytes)throw new Error("INPUT_TOO_LARGE");
 return Object.fromEntries(new URLSearchParams(text));
}
export async function persistentRateLimit(request:Request,scope:string,limit:number,windowMs:number) {
 const secret=process.env.ADMIN_SESSION_SECRET;
 if(!secret||secret.length<32)throw new Error("RATE_LIMIT_NOT_CONFIGURED");
 // Only trust forwarding headers when the deployment platform sets them.
 const ip=process.env.VERCEL?request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()??"unknown":"local";
 const hash=createHmac("sha256",secret).update(scope+":"+ip).digest("hex");
 const bucket=Math.floor(Date.now()/windowMs);const expires=new Date((bucket+2)*windowMs);
 const [row]=await getSql()`INSERT INTO request_rate_limits(key_hash,bucket,expires_at) VALUES(${hash},${bucket},${expires})
 ON CONFLICT(key_hash,bucket) DO UPDATE SET attempts=request_rate_limits.attempts+1 RETURNING attempts`;
 return Number(row.attempts)<=limit;
}
