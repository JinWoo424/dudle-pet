import type { PageType } from "@/lib/seo";
import { productionHostname } from "@/lib/deployment";
import { adsenseSlot, isAdsenseRuntimeEnabled, type AdPlacement } from "./ad-config";
import { AdsenseUnit } from "./adsense-unit";

export type { AdPlacement } from "./ad-config";

export function AdSlot({ placement, monetization = "OFF", pageType }: { placement: AdPlacement; monetization?: "FULL" | "LIMITED" | "OFF"; pageType: PageType | "HOME" }) {
  const disabledPage = ["SEARCH", "NEARBY", "ADMIN"].includes(pageType);
  const layoutPreview = process.env.VERCEL_ENV === "preview" && process.env.ADSENSE_LAYOUT_PREVIEW === "true";
  const previewablePlacement: AdPlacement[] = ["HOME_CONTENT_1", "HOSPITAL_LIST_1", "PHARMACY_LIST_1", "COST_CONTENT_1", "FACILITY_DETAIL_1"];
  if (layoutPreview && !disabledPage && monetization !== "OFF" && previewablePlacement.includes(placement)) return <aside className="ad-slot ad-slot-preview" aria-label="광고 배치 미리보기"><span>광고</span><strong>AdSense 광고 영역</strong><small>{placement}</small></aside>;
  const slot = adsenseSlot(placement);
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  if (!isAdsenseRuntimeEnabled() || monetization === "OFF" || disabledPage || !slot || !client) return null;
  return <AdsenseUnit clientId={client} slot={slot} productionHost={productionHostname()} />;
}

