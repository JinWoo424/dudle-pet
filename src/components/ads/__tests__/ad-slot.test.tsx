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

  it("keeps admin, search, and nearby pages ad-free", () => {
    process.env.VERCEL_ENV = "preview";
    process.env.ADSENSE_LAYOUT_PREVIEW = "true";
    expect(AdSlot({ placement: "HOME_CONTENT_1", pageType: "ADMIN" })).toBeNull();
    expect(AdSlot({ placement: "HOME_CONTENT_1", pageType: "SEARCH" })).toBeNull();
    expect(AdSlot({ placement: "HOME_CONTENT_1", pageType: "NEARBY" })).toBeNull();
  });
});
