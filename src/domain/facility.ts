export type FacilityKind = "ANIMAL_HOSPITAL" | "ANIMAL_PHARMACY" | "PET_FUNERAL";
export type TriState = "YES" | "NO" | "UNKNOWN";

export interface FacilityFeatureSet {
  open24h: TriState;
  nightService: TriState;
  exoticService: TriState;
  catService: TriState;
  parkingAvailable: TriState;
  verificationStatus: "VALID" | "EXPIRING" | "EXPIRED" | "UNVERIFIED";
  verifiedAt?: string;
  sourceLabel?: string;
  sourceUrl?: string;
}

export interface FacilityView {
  verifications?: Array<{fieldName:string;fieldValue:string;sourceType:string;sourceUrl?:string;evidenceNote?:string;verifiedAt:string;expiresAt:string}>;
  id: string;
  type: FacilityKind;
  name: string;
  phone?: string;
  roadAddress: string;
  province: string;
  city: string;
  district?: string;
  legalDong?: string;
  latitude?: number;
  longitude?: number;
  businessStatus: "OPEN" | "CLOSED" | "TEMP_CLOSED" | "SUSPENDED" | "UNKNOWN";
  sourceName: string;
  sourceDate: string;
  regionSlug?: string;
  syncedAt?: string;
  updatedAt?: string;
  features: FacilityFeatureSet;
  distanceMeters?: number;
}

export interface FeeStatisticView {
  categoryCode: string;
  itemCode: string;
  itemName: string;
  region: string;
  regionLevel: "CITY" | "PROVINCE" | "NATIONAL";
  surveyYear: number;
  minimumPrice: number | null;
  medianPrice: number | null;
  averagePrice: number | null;
  maximumPrice: number | null;
  sampleCount: number | null;
  sourceName: string;
  sourceUrl?: string;
  sourceDate?: string;
  collectedAt?: string;
  regionSlug?: string;
  surveyRegionCode?: string;
  surveyProvinceName?: string;
  surveyCityName?: string;
  regionMatchStatus?: "MATCHED" | "HISTORICAL_ONLY" | "NOT_APPLICABLE";
  animalType?: string;
  weightClass?: string;
}
