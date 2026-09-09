export const HOSPITAL_LIST_AD_AFTER_CARD = 6;
export const HOSPITAL_LIST_AD_MINIMUM_FACILITIES = 8;

export function shouldInsertHospitalListAd(totalFacilities: number, visibleFacilities: number) {
  return (
    totalFacilities >= HOSPITAL_LIST_AD_MINIMUM_FACILITIES &&
    visibleFacilities >= HOSPITAL_LIST_AD_AFTER_CARD
  );
}

export function hasFacilityDetailAdQuality(facility: {
  businessStatus: string;
  name: string;
  roadAddress: string;
  regionSlug?: string;
  syncedAt?: string;
}) {
  return (
    facility.businessStatus === "OPEN" &&
    Boolean(facility.name.trim()) &&
    Boolean(facility.roadAddress.trim()) &&
    Boolean(facility.regionSlug) &&
    Boolean(facility.syncedAt)
  );
}
