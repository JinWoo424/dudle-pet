import { cookies } from "next/headers";
import { previewFeeImport } from "@/data/fee-import";
import { verifyAdminSession } from "@/lib/admin-auth";
import { sameOrigin } from "@/lib/request-security";
export const runtime="nodejs";
export async function POST(request:Request){
 if(!sameOrigin(request))return Response.json({error:"Invalid origin"},{status:403});
 if(!verifyAdminSession((await cookies()).get("dudle_admin")?.value))return Response.json({error:"Unauthorized"},{status:401});
 if(Number(request.headers.get("content-length")??0)>10_000_000)return Response.json({error:"File too large"},{status:413});
 try{const file=(await request.formData()).get("file");if(!(file instanceof File)||file.size>10_000_000)return Response.json({error:"JSON file required"},{status:400});
  const preview=await previewFeeImport(await file.text());return Response.json({...preview,rows:undefined,fileHash:`${preview.fileHash.slice(0,12)}…`},{headers:{"Cache-Control":"no-store"}});
 }catch{return Response.json({error:"공식 파일 구조 또는 검증 결과를 확인해 주세요."},{status:400});}
}
