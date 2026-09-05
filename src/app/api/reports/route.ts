import { z } from "zod";
import { getSql } from "@/db/connection";
import { limitedForm, persistentRateLimit, sameOrigin } from "@/lib/request-security";
const schema=z.object({facilityId:z.string().uuid(),reportType:z.enum(["CLOSED","WRONG_PHONE","WRONG_ADDRESS","WRONG_HOURS","WRONG_24H","WRONG_SERVICE","OTHER"]),message:z.string().trim().min(10).max(1500),contactEmail:z.union([z.literal(""),z.email().max(254)]).optional()});
export async function POST(request:Request){
 if(!sameOrigin(request))return new Response("Invalid origin",{status:403});
 try{
  if(!await persistentRateLimit(request,"report",5,3600000))return new Response("요청이 너무 많습니다.",{status:429});
  const parsed=schema.safeParse(await limitedForm(request));
  if(!parsed.success)return new Response("요청 내용을 확인해 주세요.",{status:400});
  const d=parsed.data;
  const rows=await getSql()`INSERT INTO user_reports(facility_id,report_type,message,contact_email) SELECT id,${d.reportType},${d.message},${d.contactEmail||null} FROM facilities WHERE id=${d.facilityId} RETURNING id`;
  if(!rows.length)return new Response("시설을 찾을 수 없습니다.",{status:404});
  return new Response(null,{status:303,headers:{Location:new URL(`/report?facility=${d.facilityId}&submitted=1`,request.url).href,"Cache-Control":"no-store"}});
 }catch{return new Response("요청을 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요.",{status:503});}
}
