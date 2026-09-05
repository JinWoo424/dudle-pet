import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSql } from "@/db/connection";
import { verifyAdminSession } from "@/lib/admin-auth";
import { limitedForm, sameOrigin } from "@/lib/request-security";
const fields=z.enum(["open_24h","night_service","exotic_service","cat_service","parking_available"]);
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const schema=z.discriminatedUnion("action",[
 z.object({action:z.literal("verification"),facilityId:z.uuid(),fieldName:fields,fieldValue:z.enum(["YES","NO","UNKNOWN"]),sourceType:z.enum(["OFFICIAL_WEBSITE","OFFICIAL_SOCIAL","PHONE_CONFIRMATION","KAKAO_PLACE","NAVER_PLACE","ADMIN_MANUAL","USER_REPORT_CONFIRMED"]),sourceUrl:z.union([z.literal(""),z.url().regex(/^https?:\/\//)]),evidenceNote:z.string().trim().min(5).max(1500),verifiedAt:date,expiresAt:date}),
 z.object({action:z.literal("report"),id:z.uuid(),status:z.enum(["UNDER_REVIEW","RESOLVED","REJECTED"]),adminNote:z.string().trim().min(5).max(1500)}),
 z.object({action:z.literal("seo"),id:z.uuid(),hold:z.enum(["true","false"])})
]);
export async function POST(request:Request){
 if(!sameOrigin(request))return new Response("Invalid origin",{status:403});
 if(!verifyAdminSession((await cookies()).get("dudle_admin")?.value))return new Response("Unauthorized",{status:401});
 try {
  const parsed=schema.safeParse(await limitedForm(request));if(!parsed.success)return new Response("입력값을 확인해 주세요.",{status:400});
  const d=parsed.data;const admin=process.env.ADMIN_EMAIL!;
  if(d.action==="verification"){
   const verified=new Date(d.verifiedAt+"T00:00:00+09:00"),expires=new Date(d.expiresAt+"T00:00:00+09:00");
   if(!Number.isFinite(+verified)||!Number.isFinite(+expires)||+verified>Date.now()||+expires<=Date.now()||+expires<=+verified||+expires-Date.now()>366*86400000)return new Response("확인일과 만료일을 확인해 주세요.",{status:400});
  }
  await getSql().begin(async tx=>{
   let before:Record<string,unknown>;let entityId:string;let entityType:string;
   if(d.action==="verification"){
    const [facility]=await tx`SELECT id FROM facilities WHERE id=${d.facilityId} FOR UPDATE`;if(!facility)throw new Error("NOT_FOUND");
    const previous=await tx`SELECT field_name,field_value,verified_at FROM current_facility_verifications WHERE facility_id=${d.facilityId} AND field_name=${d.fieldName}`;before=previous[0]??{};
    const verified=new Date(d.verifiedAt+"T00:00:00+09:00"),expires=new Date(d.expiresAt+"T00:00:00+09:00");
    const [saved]=await tx`INSERT INTO facility_verifications(facility_id,field_name,field_value,source_type,source_url,evidence_note,verified_at,verified_by,expires_at) VALUES(${d.facilityId},${d.fieldName},${d.fieldValue},${d.sourceType},${d.sourceUrl||null},${d.evidenceNote},${verified},${admin},${expires}) RETURNING id`;
    await tx`INSERT INTO facility_features(facility_id) VALUES(${d.facilityId}) ON CONFLICT(facility_id) DO NOTHING`;
    await tx`UPDATE facility_features SET ${tx(d.fieldName)}=COALESCE((SELECT field_value::tri_state FROM current_facility_verifications WHERE facility_id=${d.facilityId} AND field_name=${d.fieldName}),'UNKNOWN'::tri_state),updated_at=now() WHERE facility_id=${d.facilityId}`;
    entityId=saved.id;entityType="facility_verifications";
   }else if(d.action==="report"){
    const [previous]=await tx`SELECT id,status,admin_note FROM user_reports WHERE id=${d.id} FOR UPDATE`;if(!previous)throw new Error("NOT_FOUND");before=previous;
    await tx`UPDATE user_reports SET status=${d.status},admin_note=${d.adminNote},resolved_at=${d.status==="UNDER_REVIEW"?null:new Date()} WHERE id=${d.id}`;entityId=d.id;entityType="user_reports";
   }else{
    const [previous]=await tx`SELECT id,manual_hold,seo_status FROM seo_pages WHERE id=${d.id} FOR UPDATE`;if(!previous)throw new Error("NOT_FOUND");before=previous;
    await tx`UPDATE seo_pages SET manual_hold=${d.hold==="true"},seo_status=${d.hold==="true"?"NOINDEX_MANUAL":"NOINDEX_LOW_DATA"},monetization_status='OFF',last_evaluated_at=now() WHERE id=${d.id}`;entityId=d.id;entityType="seo_pages";
   }
   await tx`INSERT INTO admin_audit_logs(admin,action,entity_type,entity_id,before_json,after_json) VALUES(${admin},${d.action},${entityType},${entityId},${tx.json(JSON.parse(JSON.stringify(before)))},${tx.json(d)})`;
  });
  revalidatePath("/","layout");
  return new Response(null,{status:303,headers:{Location:new URL(`/admin?view=${d.action==="verification"?"verifications":d.action==="report"?"reports":"seo"}&saved=1`,request.url).href}});
 }catch{return new Response("저장하지 못했습니다. 입력 ID와 DB 연결을 확인하세요.",{status:503});}
}
