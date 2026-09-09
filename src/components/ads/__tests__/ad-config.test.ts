import { describe, expect, it } from "vitest";
import { adsenseSlot, isAdsenseRuntimeEnabled } from "../ad-config";

describe("AdSense configuration", () => {
  const complete = {
    VERCEL_ENV: "production",
    ADSENSE_ENABLED: "true",
    NEXT_PUBLIC_ADSENSE_CLIENT_ID: "test-client",
    NEXT_PUBLIC_ADSENSE_SLOT_HOME_1: "test-slot",
  };

  it("enables real ads only in production with the required client", () => {
    expect(isAdsenseRuntimeEnabled(complete)).toBe(true);
    expect(isAdsenseRuntimeEnabled({ ...complete, VERCEL_ENV: "preview" })).toBe(false);
    expect(isAdsenseRuntimeEnabled({ ...complete, ADSENSE_ENABLED: "false" })).toBe(false);
    expect(isAdsenseRuntimeEnabled({ ...complete, NEXT_PUBLIC_ADSENSE_CLIENT_ID: "" })).toBe(false);
  });

  it("maps only HOME_CONTENT_1 in phase 1", () => {
    expect(adsenseSlot("HOME_CONTENT_1", complete)).toBe("test-slot");
    expect(adsenseSlot("HOME_CONTENT_2", complete)).toBeUndefined();
    expect(adsenseSlot("FACILITY_DETAIL_1", complete)).toBeUndefined();
  });
});
