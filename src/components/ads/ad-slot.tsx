import type { PageType } from "@/lib/seo";

export type AdPlacement = "HOME_CONTENT_1" | "HOME_CONTENT_2" | "HOSPITAL_LIST_1" | "PHARMACY_LIST_1" | "FUNERAL_CONTENT_1" | "COST_CONTENT_1" | "FACILITY_DETAIL_1";
const slots: Partial<Record<AdPlacement, string>> = {};

export function AdSlot({ placement, monetization = "OFF", pageType }: { placement: AdPlacement; monetization?: "FULL" | "LIMITED" | "OFF"; pageType: PageType | "HOME" }) {
  const disabledPage = ["SEARCH", "NEARBY", "ADMIN"].includes(pageType);
  const layoutPreview = process.env.VERCEL_ENV === "preview" && process.env.ADSENSE_LAYOUT_PREVIEW === "true";
  if (layoutPreview && !disabledPage) return <aside className="ad-slot ad-slot-preview" aria-label="광고 배치 미리보기"><span>광고</span><strong>AdSense 광고 영역</strong><small>{placement}</small></aside>;
  const slot = slots[placement];
  if (process.env.ADSENSE_ENABLED !== "true" || monetization === "OFF" || disabledPage || !slot) return null;
  return <div className="ad-slot" aria-label="광고"><ins className="adsbygoogle" data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true" /></div>;
}

