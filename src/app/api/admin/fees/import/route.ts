import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { importFeeFile } from "@/data/fee-import";
import { verifyAdminSession } from "@/lib/admin-auth";
import { sameOrigin } from "@/lib/request-security";
export const runtime="nodejs";
export async function POST(request:Request){
 if(!sameOrigin(request))return Response.json({error:"Invalid origin"},{status:403});
 if(!verifyAdminSession((await cookies()).get("dudle_admin")?.value))return Response.json({error:"Unauthorized"},{status:401});
 if(Number(request.headers.get("content-length")??0)>10_000_000)return Response.json({error:"File too large"},{status:413});
 try{const file=(await request.formData()).get("file");if(!(file instanceof File)||file.size>10_000_000)return Response.json({error:"JSON file required"},{status:400});
  const result=await importFeeFile(await file.text(),file.name,process.env.ADMIN_EMAIL!);revalidatePath("/cost","layout");return Response.json(result,{headers:{"Cache-Control":"no-store"}});
 }catch{return Response.json({error:"Preview를 통과한 공식 파일만 Import할 수 있습니다."},{status:400});}
}
