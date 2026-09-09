import { describe, expect, it } from "vitest";
import {
  HOSPITAL_LIST_AD_AFTER_CARD,
  HOSPITAL_LIST_AD_MINIMUM_FACILITIES,
  hasFacilityDetailAdQuality,
  shouldInsertHospitalListAd,
} from "../ad-placement-policy";

describe("hospital list ad policy", () => {
  it("inserts after six cards only when at least eight hospitals exist", () => {
    expect(HOSPITAL_LIST_AD_AFTER_CARD).toBe(6);
    expect(HOSPITAL_LIST_AD_MINIMUM_FACILITIES).toBe(8);
    expect(shouldInsertHospitalListAd(8, 6)).toBe(true);
  });

  it("omits the ad for short or low-data lists", () => {
    expect(shouldInsertHospitalListAd(7, 7)).toBe(false);
    expect(shouldInsertHospitalListAd(30, 5)).toBe(false);
  });
});

describe("facility detail advertising policy", () => {
  const complete = {
    businessStatus: "OPEN",
    name: "테스트 동물병원",
    roadAddress: "서울특별시 테스트로 1",
    regionSlug: "seoul",
    syncedAt: "2026-09-01",
  };

  it("requires an active, region-mapped, recently synced public detail", () => {
    expect(hasFacilityDetailAdQuality(complete)).toBe(true);
    expect(hasFacilityDetailAdQuality({ ...complete, businessStatus: "CLOSED" })).toBe(false);
    expect(hasFacilityDetailAdQuality({ ...complete, roadAddress: "" })).toBe(false);
    expect(hasFacilityDetailAdQuality({ ...complete, regionSlug: undefined })).toBe(false);
    expect(hasFacilityDetailAdQuality({ ...complete, syncedAt: undefined })).toBe(false);
  });
});
