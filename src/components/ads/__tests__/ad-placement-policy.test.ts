import { describe, expect, it } from "vitest";
import {
  HOSPITAL_LIST_AD_AFTER_CARD,
  HOSPITAL_LIST_AD_MINIMUM_FACILITIES,
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
