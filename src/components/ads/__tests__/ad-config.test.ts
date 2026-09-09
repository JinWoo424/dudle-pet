import { describe, expect, it } from "vitest";
import { adsenseSlot, isAdsenseRuntimeEnabled } from "../ad-config";

describe("AdSense configuration", () => {
  const complete = {
    VERCEL_ENV: "production",
    ADSENSE_ENABLED: "true",
    NEXT_PUBLIC_ADSENSE_CLIENT_ID: "test-client",
    NEXT_PUBLIC_ADSENSE_SLOT_HOME_1: "test-slot",
    NEXT_PUBLIC_ADSENSE_SLOT_HOSPITAL_LIST_1: "hospital-slot",
  };

  it("enables real ads only in production with the required client", () => {
    expect(isAdsenseRuntimeEnabled(complete)).toBe(true);
    expect(isAdsenseRuntimeEnabled({ ...complete, VERCEL_ENV: "preview" })).toBe(false);
    expect(isAdsenseRuntimeEnabled({ ...complete, ADSENSE_ENABLED: "false" })).toBe(false);
    expect(isAdsenseRuntimeEnabled({ ...complete, NEXT_PUBLIC_ADSENSE_CLIENT_ID: "" })).toBe(false);
  });

  it("maps only the approved home and hospital list placements", () => {
    expect(adsenseSlot("HOME_CONTENT_1", complete)).toBe("test-slot");
    expect(adsenseSlot("HOSPITAL_LIST_1", complete)).toBe("hospital-slot");
    expect(adsenseSlot("HOME_CONTENT_2", complete)).toBeUndefined();
    expect(adsenseSlot("PHARMACY_LIST_1", complete)).toBeUndefined();
    expect(adsenseSlot("FACILITY_DETAIL_1", complete)).toBeUndefined();
  });
});
