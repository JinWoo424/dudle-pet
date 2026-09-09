import { afterEach, describe, expect, it } from "vitest";
import { AdSlot } from "../ad-slot";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("AdSlot safety policy", () => {
  it("collapses when AdSense and layout preview are disabled", () => {
    process.env.ADSENSE_ENABLED = "false";
    process.env.ADSENSE_LAYOUT_PREVIEW = "false";
    expect(AdSlot({ placement: "HOME_CONTENT_1", pageType: "HOME" })).toBeNull();
  });

  it("renders a labelled placeholder only in Vercel Preview", () => {
    process.env.VERCEL_ENV = "preview";
    process.env.ADSENSE_ENABLED = "false";
    process.env.ADSENSE_LAYOUT_PREVIEW = "true";
    const result = AdSlot({ placement: "HOME_CONTENT_1", pageType: "HOME" });
    expect(result).not.toBeNull();
    expect(result?.props.className).toContain("ad-slot-preview");
    expect(result?.props.children).not.toContain("adsbygoogle");
  });

  it("never exposes a placeholder on production", () => {
    process.env.VERCEL_ENV = "production";
    process.env.ADSENSE_ENABLED = "false";
    process.env.ADSENSE_LAYOUT_PREVIEW = "true";
    expect(AdSlot({ placement: "HOME_CONTENT_1", pageType: "HOME" })).toBeNull();
  });

  it("connects only HOME_CONTENT_1 when production AdSense config is complete", () => {
    process.env.VERCEL_ENV = "production";
    process.env.ADSENSE_ENABLED = "true";
    process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID = "test-client";
    process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME_1 = "test-slot";

    const homeOne = AdSlot({ placement: "HOME_CONTENT_1", pageType: "HOME", monetization: "FULL" });
    expect(homeOne).not.toBeNull();
    expect(homeOne?.props.slot).toBe("test-slot");
    expect(AdSlot({ placement: "HOME_CONTENT_2", pageType: "HOME", monetization: "FULL" })).toBeNull();
    expect(AdSlot({ placement: "HOSPITAL_LIST_1", pageType: "HOSPITAL_REGION", monetization: "FULL" })).toBeNull();
  });

  it("never renders a real unit in Preview even if AdSense is misconfigured on", () => {
    process.env.VERCEL_ENV = "preview";
    process.env.ADSENSE_ENABLED = "true";
    process.env.ADSENSE_LAYOUT_PREVIEW = "false";
    process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID = "test-client";
    process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME_1 = "test-slot";
    expect(AdSlot({ placement: "HOME_CONTENT_1", pageType: "HOME", monetization: "FULL" })).toBeNull();
  });

  it("keeps admin, search, and nearby pages ad-free", () => {
    process.env.VERCEL_ENV = "preview";
    process.env.ADSENSE_LAYOUT_PREVIEW = "true";
    expect(AdSlot({ placement: "HOME_CONTENT_1", pageType: "ADMIN" })).toBeNull();
    expect(AdSlot({ placement: "HOME_CONTENT_1", pageType: "SEARCH" })).toBeNull();
    expect(AdSlot({ placement: "HOME_CONTENT_1", pageType: "NEARBY" })).toBeNull();
  });
});
