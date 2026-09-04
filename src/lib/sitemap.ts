import { guideEntries } from "@/content/guides";
import { listFacilities } from "@/data/repository";

export const sitemapKinds = ["regions", "hospitals-1", "pharmacies-1", "funerals", "costs", "guides"] as const;
export type SitemapKind = (typeof sitemapKinds)[number];

export async function urlsForSitemap(kind: SitemapKind) {
  const facilities = await listFacilities();
  switch (kind) {
    case "regions": return ["/", "/hospital", "/hospital/jeonnam/yeosu", "/hospital/jeonnam/yeosu/24h", "/hospital/jeonnam/yeosu/night", "/pharmacy", "/pharmacy/jeonnam/yeosu", "/funeral", "/funeral/jeonnam"];
    case "hospitals-1": return facilities.filter((item) => item.type === "ANIMAL_HOSPITAL" && item.name && item.roadAddress).map((item) => `/hospital/jeonnam/yeosu/${item.id}`);
    case "pharmacies-1": return facilities.filter((item) => item.type === "ANIMAL_PHARMACY" && item.name && item.roadAddress).map((item) => `/pharmacy/jeonnam/yeosu/${item.id}`);
    case "funerals": return facilities.filter((item) => item.type === "PET_FUNERAL" && item.name && item.roadAddress).map((item) => `/funeral/jeonnam/yeosu/${item.id}`);
    case "costs": return ["/cost", "/cost/jeonnam/yeosu", ...["consultation", "vaccination", "blood-test", "xray", "ultrasound", "ct", "mri"].map((item) => `/cost/jeonnam/yeosu/${item}`)];
    case "guides": return ["/guide", ...guideEntries.map((item) => `/guide/${item.slug}`), "/about", "/data-policy"];
  }
}

export function xmlResponse(body: string) { return new Response(`<?xml version="1.0" encoding="UTF-8"?>${body}`, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600, s-maxage=21600" } }); }

