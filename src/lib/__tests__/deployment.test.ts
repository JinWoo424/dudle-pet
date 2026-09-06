import { describe, expect, it } from "vitest";
import { deploymentTarget, isCanonicalProductionHost, isPreviewDeployment, previewRobotsPolicy, productionHostname, shouldNoIndexHost } from "../deployment";

const production = { NEXT_PUBLIC_SITE_URL: "https://pet.dudle.co.kr", VERCEL: "1", VERCEL_ENV: "production" };

describe("deployment indexing policy", () => {
  it("allows the canonical production host", () => expect(shouldNoIndexHost("pet.dudle.co.kr", production)).toBe(false));
  it("blocks a Vercel alias", () => expect(shouldNoIndexHost("dudle-pet.vercel.app", production)).toBe(true));
  it("blocks every preview host", () => expect(shouldNoIndexHost("pet.dudle.co.kr", { ...production, VERCEL_ENV: "preview" })).toBe(true));
  it("does not treat local development as a deployed alias", () => expect(shouldNoIndexHost("localhost", {})).toBe(false));
  it("normalizes canonical host case", () => expect(isCanonicalProductionHost("PET.DUDLE.CO.KR", production)).toBe(true));
  it("recognizes preview scope", () => expect(isPreviewDeployment({ VERCEL_ENV: "preview" })).toBe(true));
  it("classifies Vercel preview", () => expect(deploymentTarget({ VERCEL_ENV: "preview" })).toBe("preview"));
  it("classifies Vercel production", () => expect(deploymentTarget({ VERCEL_ENV: "production" })).toBe("production"));
  it("classifies an unset Vercel environment as local", () => expect(deploymentTarget({})).toBe("local"));
  it("keeps the configured production canonical host", () => expect(productionHostname({ NEXT_PUBLIC_SITE_URL: "https://pet.dudle.co.kr" })).toBe("pet.dudle.co.kr"));
  it("forces noindex and nofollow metadata in preview", () => expect(previewRobotsPolicy({ VERCEL_ENV: "preview" })).toEqual({ index: false, follow: false }));
  it("does not override production page-level robots metadata", () => expect(previewRobotsPolicy({ VERCEL_ENV: "production" })).toBeUndefined());
});
