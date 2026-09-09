export const HOSPITAL_LIST_AD_AFTER_CARD = 6;
export const HOSPITAL_LIST_AD_MINIMUM_FACILITIES = 8;

export function shouldInsertHospitalListAd(totalFacilities: number, visibleFacilities: number) {
  return (
    totalFacilities >= HOSPITAL_LIST_AD_MINIMUM_FACILITIES &&
    visibleFacilities >= HOSPITAL_LIST_AD_AFTER_CARD
  );
}
