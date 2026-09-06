import type { FacilityKind } from "@/domain/facility";

export type SourceType = "MOIS_ANIMAL_HOSPITAL" | "MOIS_ANIMAL_PHARMACY" | "MOIS_PET_FUNERAL";
export interface FetchParams { page: number; pageSize: number; filters?:Record<string,string> }
export interface RawPage { items: unknown[]; totalCount?: number; raw: unknown }
export interface NormalizedFacility {
  sourceType: SourceType; facilityType: FacilityKind; externalId: string; name: string; phone?: string; roadAddress?: string; jibunAddress?: string;
  publicStatusCode?: string; publicStatusName?: string; sourceX?: string; sourceY?: string; sourceCrs: "EPSG:5174"; sourceUpdatedAt?: string;
  businessStatus?: "OPEN"|"CLOSED"|"TEMP_CLOSED"|"SUSPENDED"|"UNKNOWN";
  postalCode?:string; publicLocalCode?:string; publicDetailStatusCode?:string; publicDetailStatusName?:string;
  licenseDate?:string; licenseCancelDate?:string; closedDate?:string; temporaryCloseStart?:string; temporaryCloseEnd?:string; reopenDate?:string;
}
export interface ValidationResult { valid: boolean; errors: string[]; warnings: string[] }
export interface FacilitySourceAdapter {
  sourceType: SourceType;
  facilityType: FacilityKind;
  fetchPage(params: FetchParams): Promise<RawPage>;
  normalize(raw: unknown): Promise<NormalizedFacility>;
  validate(item: NormalizedFacility): ValidationResult;
}
