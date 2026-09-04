import type { PageType } from "@/lib/seo";

export type AdSlotName = "HOSPITAL_REGION_TOP" | "HOSPITAL_REGION_MIDDLE" | "HOSPITAL_DETAIL_TOP" | "HOSPITAL_DETAIL_MIDDLE" | "COST_TOP" | "COST_MIDDLE" | "PHARMACY_MIDDLE" | "FUNERAL_TOP" | "FUNERAL_MIDDLE";
const slots: Partial<Record<AdSlotName, string>> = {};

export function AdSlot({ name, monetization = "OFF", pageType }: { name: AdSlotName; monetization?: "FULL" | "LIMITED" | "OFF"; pageType: PageType }) {
  const disabledPage = ["SEARCH", "NEARBY", "ADMIN"].includes(pageType);
  const slot = slots[name];
  if (process.env.ADSENSE_ENABLED !== "true" || monetization === "OFF" || disabledPage || !slot) return null;
  return <div className="ad-slot" aria-label="광고"><ins className="adsbygoogle" data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true" /></div>;
}

