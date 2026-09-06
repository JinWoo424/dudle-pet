import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { rollbackFeeImport } from "@/data/fee-import";
import { verifyAdminSession } from "@/lib/admin-auth";
import { sameOrigin } from "@/lib/request-security";
export const runtime="nodejs";
export async function POST(request:Request){
 if(!sameOrigin(request))return Response.json({error:"Invalid origin"},{status:403});
 if(!verifyAdminSession((await cookies()).get("dudle_admin")?.value))return Response.json({error:"Unauthorized"},{status:401});
 try{const parsed=z.object({batchId:z.uuid()}).parse(await request.json());const result=await rollbackFeeImport(parsed.batchId,process.env.ADMIN_EMAIL!);revalidatePath("/cost","layout");return Response.json(result,{headers:{"Cache-Control":"no-store"}});
 }catch{return Response.json({error:"활성 batch ID를 확인해 주세요."},{status:400});}
}
