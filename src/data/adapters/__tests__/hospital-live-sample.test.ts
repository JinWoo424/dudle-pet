import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { MoisHospitalAdapter } from "../mois";

describe("verified hospital sample (offline)", () => {
  it("parses five real records and preserves source fields without guessing", async () => {
    const adapter = new MoisHospitalAdapter();
    const contract = await adapter.contract();
    const text = await readFile("docs/api-samples/hospital.json", "utf8");
    expect(createHash("sha256").update(text).digest("hex")).toBe(contract.mapping?.sampleSha256);
    const page = await adapter.parse(JSON.parse(text));
    expect(page.items).toHaveLength(5);
    for (const raw of page.items) {
      const item = await adapter.normalize(raw);
      expect(adapter.validate(item).valid).toBe(true);
      expect(item.externalId).toBe((raw as Record<string,string>).MNG_NO);
      expect(item.businessStatus).toBe("OPEN");
    }
    const missing = await adapter.normalize(page.items[4]);
    expect(missing.sourceX).toBeUndefined();
    expect(missing.sourceY).toBeUndefined();
  });
});
