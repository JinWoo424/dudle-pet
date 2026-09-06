import { searchFacilities,listRegions } from "@/data/repository";
export const runtime="nodejs";
export async function GET(request:Request){
 const query=(new URL(request.url).searchParams.get("q")??"").trim().slice(0,80);
 if(!query)return Response.json({suggestions:[]});
 try{
  const regions=(await listRegions()).filter(r=>r.name.includes(query)||r.shortName.includes(query)).slice(0,5).map(r=>({type:"REGION",label:r.shortName,href:`/hospital/${r.fullSlug}`}));
  const facilities=(await searchFacilities(query)).slice(0,5).map(f=>({type:"FACILITY",label:f.name,href:`/search?q=${encodeURIComponent(f.name)}`}));
  return Response.json({suggestions:[...regions,...facilities].slice(0,7)},{headers:{"Cache-Control":"no-store"}});
 }catch{return Response.json({suggestions:[],error:"temporarily_unavailable"},{status:503});}
}
