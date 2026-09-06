import { describe, expect, it } from "vitest";
import { isCanonicalProductionHost, isPreviewDeployment, shouldNoIndexHost } from "../deployment";

const production = { NEXT_PUBLIC_SITE_URL: "https://pet.dudle.co.kr", VERCEL: "1", VERCEL_ENV: "production" };

describe("deployment indexing policy", () => {
  it("allows the canonical production host", () => expect(shouldNoIndexHost("pet.dudle.co.kr", production)).toBe(false));
  it("blocks a Vercel alias", () => expect(shouldNoIndexHost("dudle-pet.vercel.app", production)).toBe(true));
  it("blocks every preview host", () => expect(shouldNoIndexHost("pet.dudle.co.kr", { ...production, VERCEL_ENV: "preview" })).toBe(true));
  it("does not treat local development as a deployed alias", () => expect(shouldNoIndexHost("localhost", {})).toBe(false));
  it("normalizes canonical host case", () => expect(isCanonicalProductionHost("PET.DUDLE.CO.KR", production)).toBe(true));
  it("recognizes preview scope", () => expect(isPreviewDeployment({ VERCEL_ENV: "preview" })).toBe(true));
});
