import type { FacilityKind } from "@/domain/facility";
import type { RegionView } from "@/lib/regions";

export type RegionalSeoStats = {
  total: number;
  coordinateCount: number;
  phoneCount: number;
  addressCount: number;
  averageQuality: number;
  sourceDate?: string;
  syncedAt?: string;
};

const labels: Record<FacilityKind, { primary: string; detail: string }> = {
  ANIMAL_HOSPITAL: { primary: "동물병원", detail: "지도·전화·병원 정보" },
  ANIMAL_PHARMACY: { primary: "동물약국", detail: "지도·주소·전화번호" },
  PET_FUNERAL: { primary: "반려동물 장례식장", detail: "공식 등록시설 정보" },
};

export function regionKeywordName(region?: RegionView | null) {
  if (!region) return "전국";
  if (region.seoName) return region.seoName;
  if (region.level === "PROVINCE" || region.level === "CITY") return region.shortName;
  return region.name;
}

export function regionalPrimaryKeyword(type: FacilityKind, region?: RegionView | null) {
  return `${regionKeywordName(region)} ${labels[type].primary}`;
}

export function regionalTitle(type: FacilityKind, region: RegionView | null | undefined, stats: RegionalSeoStats) {
  const keyword = regionalPrimaryKeyword(type, region);
  return `${keyword} ${stats.total}곳 | ${labels[type].detail}`;
}

export function regionalDescription(type: FacilityKind, region: RegionView | null | undefined, stats: RegionalSeoStats) {
  const keyword = regionalPrimaryKeyword(type, region);
  const map = stats.coordinateCount > 0 ? `지도 표시 ${stats.coordinateCount}곳` : "지도 좌표는 확인 중";
  const phone = stats.phoneCount > 0 ? `전화번호 확인 ${stats.phoneCount}곳` : "전화번호는 시설별 확인 필요";
  const date = stats.sourceDate ?? stats.syncedAt ?? "확인 가능한 최신 공식 데이터";
  return `${keyword} ${stats.total}곳의 공식 등록상태와 주소를 확인하세요. ${map}, ${phone}이며 데이터 기준일은 ${date}입니다.`;
}

export function regionalSummary(type: FacilityKind, region: RegionView | null | undefined, stats: RegionalSeoStats) {
  const keyword = regionalPrimaryKeyword(type, region);
  return `${keyword}은 공식 등록상 영업 상태로 ${stats.total}곳이 확인됩니다. 주소가 확인된 시설은 ${stats.addressCount}곳, 좌표가 확인되어 지도에 표시되는 시설은 ${stats.coordinateCount}곳, 전화번호가 확인된 시설은 ${stats.phoneCount}곳입니다.`;
}

export function regionalSeoQuality(stats: RegionalSeoStats) {
  if (stats.total === 0) return 0;
  const coordinateCoverage = stats.coordinateCount / stats.total;
  const phoneCoverage = stats.phoneCount / stats.total;
  const addressCoverage = stats.addressCount / stats.total;
  const volume = Math.min(30, stats.total >= 30 ? 30 : stats.total);
  return Math.round(
    volume
      + coordinateCoverage * 20
      + phoneCoverage * 15
      + addressCoverage * 15
      + Math.min(20, stats.averageQuality / 5),
  );
}
