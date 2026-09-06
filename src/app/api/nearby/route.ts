import { z } from "zod";
import { nearbyFacilities } from "@/data/repository";
export const runtime="nodejs";
const schema=z.object({latitude:z.number().min(32).max(40),longitude:z.number().min(123).max(133),radiusMeters:z.union([z.literal(1000),z.literal(3000),z.literal(5000)]),type:z.enum(["ANIMAL_HOSPITAL","ANIMAL_PHARMACY","PET_FUNERAL"]),feature:z.literal("24h").optional()});
export async function POST(request:Request) {
 if(Number(request.headers.get("content-length")??0)>2048) return new Response("Request too large",{status:413});
 try {
  const body=await request.text(); if(body.length>2048)return new Response("Request too large",{status:413});
  const parsed=schema.safeParse(JSON.parse(body));if(!parsed.success)return new Response("검색 조건을 확인해 주세요.",{status:400});
  return Response.json({facilities:await nearbyFacilities(parsed.data)},{headers:{"Cache-Control":"no-store"}});
 }catch{return new Response("현재 정보를 불러오지 못했습니다.",{status:503});}
}
