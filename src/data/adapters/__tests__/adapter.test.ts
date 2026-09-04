import { describe, expect, it } from "vitest";
import { MoisHospitalAdapter } from "../mois";

describe("MOIS adapter boundary", () => {
  it("실제 mapping 전에는 raw field를 추측하지 않는다", async () => {
    const adapter = new MoisHospitalAdapter();
    await expect(adapter.normalize({ unknownKey: "value" })).rejects.toThrow("실제 response key");
  });
  it("정규화 결과의 필수값을 검증한다", () => {
    const adapter = new MoisHospitalAdapter();
    expect(adapter.validate({ sourceType: "MOIS_ANIMAL_HOSPITAL", facilityType: "ANIMAL_HOSPITAL", externalId: "", name: "", sourceCrs: "EPSG:5174" }).valid).toBe(false);
  });
});

