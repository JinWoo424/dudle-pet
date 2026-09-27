import { describe, expect, it } from "vitest";
import { facilitySearchMetadata } from "../facility-seo";

const hospital = { name: "센트럴동물병원", province: "충청북도", city: "청주시", roadAddress: "충청북도 청주시 흥덕구 송화로150번길 2", phone: "043-260-0159", type: "ANIMAL_HOSPITAL" as const, businessStatus: "OPEN" as const };
describe("facility search intent", () => {
  it("uses actual facility contact facts without claiming opening hours", () => {
    const result = facilitySearchMetadata(hospital);
    expect(result.title).toBe("청주 센트럴동물병원 | 전화번호·주소·위치");
    expect(result.description).toContain(hospital.roadAddress);
    expect(result.description).toContain(hospital.phone);
    expect(result.description).not.toMatch(/24시간|진료 중|특수동물/);
  });
  it("includes the metropolitan city for district-level pharmacies", () => {
    const result = facilitySearchMetadata({ ...hospital, name: "365메가센트럴약국", province: "대전광역시", city: "유성구", type: "ANIMAL_PHARMACY" });
    expect(result.title.startsWith("대전 365메가센트럴약국")).toBe(true);
    expect(result.description).toContain("동물용 의약품 취급 여부");
  });
  it("does not duplicate city prefixes or promise missing phone numbers", () => {
    const result = facilitySearchMetadata({ ...hospital, name: "청주동물병원", phone: undefined });
    expect(result.title).toBe("청주동물병원 | 주소·위치");
    expect(result.description).not.toContain("전화:");
  });
  it("does not imply closed facilities are currently operating", () => {
    expect(facilitySearchMetadata({ ...hospital, businessStatus: "CLOSED" }).description).toContain("현재 이용 가능 여부는 시설에 직접 확인");
  });
});
