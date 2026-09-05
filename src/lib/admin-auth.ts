import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";
export function verifyPassword(password:string,encoded:string) {
 const parts=encoded.split("$"); const [algorithm,salt,hex]=parts;
 if(parts.length!==3||algorithm!=="scrypt"||!salt||salt.length>128||!/^[a-f0-9]{128}$/i.test(hex??"")||password.length>512)return false;
 try{return timingSafeEqual(scryptSync(password,salt,64),Buffer.from(hex,"hex"));}catch{return false;}
}
export function adminConfigured(){return Boolean(process.env.ADMIN_EMAIL&&process.env.ADMIN_PASSWORD_HASH&&(process.env.ADMIN_SESSION_SECRET?.length??0)>=32);}
export function createAdminSession(email:string){
 const secret=process.env.ADMIN_SESSION_SECRET;if(!secret||secret.length<32)throw new Error("Admin session secret must be at least 32 characters");
 const payload=Buffer.from(JSON.stringify({email,exp:Date.now()+8*60*60*1000})).toString("base64url");
 return `${payload}.${createHmac("sha256",secret).update(payload).digest("base64url")}`;
}
export function verifyAdminSession(token?:string){
 const secret=process.env.ADMIN_SESSION_SECRET;
 if(!token||token.length>2048||!secret||secret.length<32)return false;
 const parts=token.split(".");if(parts.length!==2)return false;
 const [payload,signature]=parts;if(!payload||!signature||!/^[\w-]+$/.test(signature))return false;
 const expected=createHmac("sha256",secret).update(payload).digest();const received=Buffer.from(signature,"base64url");
 if(expected.length!==received.length||!timingSafeEqual(expected,received))return false;
 try{const data=JSON.parse(Buffer.from(payload,"base64url").toString());return typeof data.email==="string"&&data.email===process.env.ADMIN_EMAIL&&Number.isFinite(data.exp)&&data.exp>Date.now()&&data.exp<=Date.now()+8*60*60*1000;}catch{return false;}
}
