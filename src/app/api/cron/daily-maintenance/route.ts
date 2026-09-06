import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { publicAdapters } from "@/data/adapters/mois";
import { syncSource } from "@/data/sync";
import { refreshSeo } from "@/data/seo-maintenance";
import { getSql } from "@/db/connection";
export const runtime="nodejs";
export const maxDuration=60;
function equal(a:string,b:string){const left=Buffer.from(a),right=Buffer.from(b);return left.length===right.length&&timingSafeEqual(left,right);}
export async function GET(request:Request){
 const expected=process.env.CRON_SECRET,supplied=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"")??"";
 if(!expected||expected.length<32||!equal(supplied,expected))return new Response("Unauthorized",{status:401});
 const deadline=Date.now()+40000;const sources:Record<string,string>={};let failed=false;
 for(const adapter of publicAdapters){
  if(Date.now()>deadline){sources[adapter.sourceType]="DEFERRED_TIME_BUDGET";failed=true;continue;}
  try{const result=await syncSource(adapter,"full",deadline);sources[adapter.sourceType]=result.status;if(result.status!=="SUCCESS")failed=true;}
  catch{sources[adapter.sourceType]="BLOCKED_OR_FAILED";failed=true;}
 }
 try{await refreshSeo();await getSql()`DELETE FROM request_rate_limits WHERE expires_at<now()`;revalidatePath("/","layout");}
 catch{failed=true;}
 return Response.json({status:failed?"partial_or_failed":"success",sources},{status:failed?503:200,headers:{"Cache-Control":"no-store"}});
}
