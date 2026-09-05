import type { FacilityView } from "@/domain/facility";
export const typePaths = { ANIMAL_HOSPITAL: "hospital", ANIMAL_PHARMACY: "pharmacy", PET_FUNERAL: "funeral" } as const;
export const statusLabels = { OPEN: "공식 등록상 영업", CLOSED: "공식 등록상 폐업", TEMP_CLOSED: "공식 등록상 휴업", SUSPENDED: "공식 등록상 영업정지", UNKNOWN: "공식 등록상태 미확인" };
export function facilityPath(f: FacilityView) { return f.regionSlug ? `/${typePaths[f.type]}/${f.regionSlug}/${f.id}` : null; }
export function safeJson(value: unknown) { return JSON.stringify(value).replace(/</g, "\\u003c"); }
export function directionsUrl(f: FacilityView) {
 return f.latitude != null && f.longitude != null
  ? `https://map.kakao.com/link/to/${encodeURIComponent(f.name)},${f.latitude},${f.longitude}`
  : `https://map.kakao.com/link/search/${encodeURIComponent(f.roadAddress)}`;
}
