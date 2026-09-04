import { searchFacilities } from "@/data/repository";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!query) return Response.json({ suggestions: [] });
  const facilities = (await searchFacilities(query)).slice(0, 5).map((item) => ({ type: "FACILITY", label: item.name, href: `/search?q=${encodeURIComponent(item.name)}` }));
  const regions = ["여수", "순천", "광주", "서울", "부산"].filter((region) => region.includes(query)).map((label) => ({ type: "REGION", label, href: `/search?q=${encodeURIComponent(label)}` }));
  const intent = query.includes("24") ? [{ type: "SEARCH_INTENT", label: "여수 24시간 동물병원", href: "/hospital/jeonnam/yeosu/24h" }] : [];
  return Response.json({ suggestions: [...regions, ...intent, ...facilities].slice(0, 7) });
}

