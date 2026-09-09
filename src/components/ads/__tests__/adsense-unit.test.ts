// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { initializeAdsenseUnit } from "../adsense-unit";

describe("initializeAdsenseUnit", () => {
  it("queues an ad exactly once for the same element", () => {
    const element = document.createElement("ins");
    const push = vi.fn(() => 1);

    expect(initializeAdsenseUnit(element, { push })).toBe(true);
    expect(initializeAdsenseUnit(element, { push })).toBe(false);
    expect(push).toHaveBeenCalledTimes(1);
  });

  it("does not reinitialize an element already claimed by AdSense", () => {
    const element = document.createElement("ins");
    element.dataset.adsbygoogleStatus = "done";
    const push = vi.fn(() => 1);

    expect(initializeAdsenseUnit(element, { push })).toBe(false);
    expect(push).not.toHaveBeenCalled();
  });
});
