import { describe, expect, it } from "vitest";
import { MoisHospitalAdapter } from "../mois";

describe("MOIS adapter boundary", () => {
  it("실제 mapping에 없는 LOCALDATA field를 추측하지 않는다", async () => {
    const adapter = new MoisHospitalAdapter();
    await expect(adapter.normalize({ unknownKey: "value" })).rejects.toThrow("MAPPED_FIELD_MISSING");
  });
  it("정규화 결과의 필수값을 검증한다", () => {
    const adapter = new MoisHospitalAdapter();
    expect(adapter.validate({ sourceType: "MOIS_ANIMAL_HOSPITAL", facilityType: "ANIMAL_HOSPITAL", externalId: "", name: "", sourceCrs: "EPSG:5174" }).valid).toBe(false);
  });
});
