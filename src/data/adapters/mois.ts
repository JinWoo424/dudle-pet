import { z } from "zod";
import type { FacilityKind } from "@/domain/facility";
import type { FacilitySourceAdapter, FetchParams, NormalizedFacility, RawPage, SourceType, ValidationResult } from "./types";

const objectRecord = z.record(z.string(), z.unknown());

function extractItems(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== "object") return [];
  const root = raw as Record<string, unknown>;
  for (const candidate of [root.items, root.data, root.body, root.response]) {
    if (Array.isArray(candidate)) return candidate;
    if (candidate && typeof candidate === "object") {
      const nested = candidate as Record<string, unknown>;
      if (Array.isArray(nested.items)) return nested.items;
      if (nested.items && typeof nested.items === "object" && Array.isArray((nested.items as Record<string, unknown>).item)) return (nested.items as Record<string, unknown>).item as unknown[];
    }
  }
  return [];
}

abstract class MoisAdapter implements FacilitySourceAdapter {
  abstract sourceType: SourceType;
  abstract facilityType: FacilityKind;
  abstract endpointEnv: "PUBLIC_DATA_HOSPITAL_ENDPOINT" | "PUBLIC_DATA_PHARMACY_ENDPOINT" | "PUBLIC_DATA_FUNERAL_ENDPOINT";

  async fetchPage(params: FetchParams): Promise<RawPage> {
    const endpoint = process.env[this.endpointEnv];
    const key = process.env.PUBLIC_DATA_SERVICE_KEY;
    if (!endpoint) throw new Error(`${this.endpointEnv}가 설정되지 않았습니다. 실제 API 문서에서 endpoint를 확인하세요.`);
    if (!key) throw new Error("PUBLIC_DATA_SERVICE_KEY가 설정되지 않았습니다.");
    const url = new URL(endpoint);
    url.searchParams.set("serviceKey", key);
    url.searchParams.set("pageNo", String(params.page));
    url.searchParams.set("numOfRows", String(params.pageSize));
    url.searchParams.set("type", "json");
    const response = await fetch(url, { signal: AbortSignal.timeout(15_000), headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Public API HTTP ${response.status}`);
    const raw: unknown = await response.json();
    return { items: extractItems(raw), raw };
  }

  async normalize(raw: unknown): Promise<NormalizedFacility> {
    const parsed = objectRecord.safeParse(raw);
    if (!parsed.success) throw new Error("시설 raw record가 JSON object가 아닙니다.");
    throw new Error(`${this.sourceType} mapping은 inspect:public-api로 실제 response key를 확인한 뒤 확정해야 합니다.`);
  }

  validate(item: NormalizedFacility): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    if (!item.externalId.trim()) errors.push("externalId is required");
    if (!item.name.trim()) errors.push("name is required");
    if (!item.roadAddress && !item.jibunAddress) warnings.push("address is missing");
    if (!item.sourceX || !item.sourceY) warnings.push("coordinates are missing");
    return { valid: errors.length === 0, errors, warnings };
  }
}

export class MoisHospitalAdapter extends MoisAdapter {
  sourceType = "MOIS_ANIMAL_HOSPITAL" as const; facilityType = "ANIMAL_HOSPITAL" as const; endpointEnv = "PUBLIC_DATA_HOSPITAL_ENDPOINT" as const;
}
export class MoisAnimalPharmacyAdapter extends MoisAdapter {
  sourceType = "MOIS_ANIMAL_PHARMACY" as const; facilityType = "ANIMAL_PHARMACY" as const; endpointEnv = "PUBLIC_DATA_PHARMACY_ENDPOINT" as const;
}
export class MoisPetFuneralAdapter extends MoisAdapter {
  sourceType = "MOIS_PET_FUNERAL" as const; facilityType = "PET_FUNERAL" as const; endpointEnv = "PUBLIC_DATA_FUNERAL_ENDPOINT" as const;
}

export const publicAdapters: FacilitySourceAdapter[] = [new MoisHospitalAdapter(), new MoisAnimalPharmacyAdapter(), new MoisPetFuneralAdapter()];

