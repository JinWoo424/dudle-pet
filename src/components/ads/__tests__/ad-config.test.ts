import { describe, expect, it } from "vitest";
import { adsenseSlot, isAdsenseRuntimeEnabled } from "../ad-config";

describe("AdSense configuration", () => {
  const complete = {
    VERCEL_ENV: "production",
    ADSENSE_ENABLED: "true",
    NEXT_PUBLIC_ADSENSE_CLIENT_ID: "test-client",
    NEXT_PUBLIC_ADSENSE_SLOT_HOME_1: "test-slot",
    NEXT_PUBLIC_ADSENSE_SLOT_HOSPITAL_LIST_1: "hospital-slot",
    NEXT_PUBLIC_ADSENSE_SLOT_COST_CONTENT_1: "cost-slot",
    NEXT_PUBLIC_ADSENSE_SLOT_FACILITY_DETAIL_1: "detail-slot",
  };

  it("enables real ads only in production with the required client", () => {
    expect(isAdsenseRuntimeEnabled(complete)).toBe(true);
    expect(isAdsenseRuntimeEnabled({ ...complete, VERCEL_ENV: "preview" })).toBe(false);
    expect(isAdsenseRuntimeEnabled({ ...complete, ADSENSE_ENABLED: "false" })).toBe(false);
    expect(isAdsenseRuntimeEnabled({ ...complete, NEXT_PUBLIC_ADSENSE_CLIENT_ID: "" })).toBe(false);
  });

  it("maps the approved placement environment contracts", () => {
    expect(adsenseSlot("HOME_CONTENT_1", complete)).toBe("test-slot");
    expect(adsenseSlot("HOSPITAL_LIST_1", complete)).toBe("hospital-slot");
    expect(adsenseSlot("COST_CONTENT_1", complete)).toBe("cost-slot");
    expect(adsenseSlot("FACILITY_DETAIL_1", complete)).toBe("detail-slot");
    expect(adsenseSlot("HOME_CONTENT_2", complete)).toBeUndefined();
    expect(adsenseSlot("PHARMACY_LIST_1", complete)).toBeUndefined();
  });

  it("collapses placements whose slot contract is empty", () => {
    expect(adsenseSlot("COST_CONTENT_1", { ...complete, NEXT_PUBLIC_ADSENSE_SLOT_COST_CONTENT_1: "" })).toBeUndefined();
    expect(adsenseSlot("FACILITY_DETAIL_1", { ...complete, NEXT_PUBLIC_ADSENSE_SLOT_FACILITY_DETAIL_1: undefined })).toBeUndefined();
  });
});
